import { NextHandleFunction } from 'connect'
import { IncomingMessage, ServerResponse } from 'http'
import { join, normalize, relative as relativePath, sep } from 'path'
import { UrlObject } from 'url'
import webpack from 'webpack'
import WebpackDevMiddleware from 'webpack-dev-middleware'
import WebpackHotMiddleware from 'webpack-hot-middleware'
import { createEntrypoints, createPagesMapping } from '../build/entries'
import { watchCompilers } from '../build/output'
import getBaseWebpackConfig from '../build/webpack-config'
import { NEXT_PROJECT_ROOT_DIST_CLIENT } from '../lib/constants'
import { fileExists } from '../lib/file-exists'
import { recursiveDelete } from '../lib/recursive-delete'
import {
  BLOCKED_PAGES,
  CLIENT_STATIC_FILES_RUNTIME_AMP,
  IS_BUNDLED_PAGE_REGEX,
  ROUTE_NAME_REGEX,
} from '../next-server/lib/constants'
import { __ApiPreviewProps } from '../next-server/server/api-utils'
import { route } from '../next-server/server/router'
import errorOverlayMiddleware from './lib/error-overlay-middleware'
import { findPageFile } from './lib/find-page-file'
import onDemandEntryHandler, { normalizePage } from './on-demand-entry-handler'

export async function renderScriptError(res: ServerResponse, error: Error) {
  // Asks CDNs and others to not to cache the errored page
  res.setHeader(
    'Cache-Control',
    'no-cache, no-store, max-age=0, must-revalidate'
  )

  if (
    (error as any).code === 'ENOENT' ||
    error.message === 'INVALID_BUILD_ID'
  ) {
    res.statusCode = 404
    res.end('404 - Not Found')
    return
  }

  console.error(error.stack)
  res.statusCode = 500
  res.end('500 - Internal Error')
}

function addCorsSupport(req: IncomingMessage, res: ServerResponse) {
  if (!req.headers.origin) {
    return { preflight: false }
  }

  res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET')
  // Based on https://github.com/primus/access-control/blob/4cf1bc0e54b086c91e6aa44fb14966fa5ef7549c/index.js#L158
  if (req.headers['access-control-request-headers']) {
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] as string
    )
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return { preflight: true }
  }

  return { preflight: false }
}

const matchNextPageBundleRequest = route(
  '/_next/static/:buildId/pages/:path*.js(\\.map|)'
)

// Recursively look up the issuer till it ends up at the root
function findEntryModule(issuer: any): any {
  if (issuer.issuer) {
    return findEntryModule(issuer.issuer)
  }

  return issuer
}

function erroredPages(
  compilation: webpack.compilation.Compilation,
  options = { enhanceName: (name: string) => name }
) {
  const failedPages: { [page: string]: any[] } = {}
  for (const error of compilation.errors) {
    if (!error.origin) {
      continue
    }

    const entryModule = findEntryModule(error.origin)
    const { name } = entryModule
    if (!name) {
      continue
    }

    // Only pages have to be reloaded
    if (!IS_BUNDLED_PAGE_REGEX.test(name)) {
      continue
    }

    const enhancedName = options.enhanceName(name)

    if (!failedPages[enhancedName]) {
      failedPages[enhancedName] = []
    }

    failedPages[enhancedName].push(error)
  }

  return failedPages
}

export default class HotReloader {
  private dir: string
  private buildId: string
  private middlewares: any[]
  private pagesDir: string
  private webpackDevMiddleware: WebpackDevMiddleware.WebpackDevMiddleware | null
  private webpackHotMiddleware:
    | (NextHandleFunction & WebpackHotMiddleware.EventStream)
    | null
  private initialized: boolean
  private config: any
  private stats: any
  private serverPrevDocumentHash: string | null
  private prevChunkNames?: Set<any>
  private onDemandEntries: any
  private previewProps: __ApiPreviewProps

  constructor(
    dir: string,
    {
      config,
      pagesDir,
      buildId,
      previewProps,
    }: {
      config: object
      pagesDir: string
      buildId: string
      previewProps: __ApiPreviewProps
    }
  ) {
    this.buildId = buildId
    this.dir = dir
    this.middlewares = []
    this.pagesDir = pagesDir
    this.webpackDevMiddleware = null
    this.webpackHotMiddleware = null
    this.initialized = false
    this.stats = null
    this.serverPrevDocumentHash = null

    this.config = config
    this.previewProps = previewProps
  }

  async run(req: IncomingMessage, res: ServerResponse, parsedUrl: UrlObject) {
    // Usually CORS support is not needed for the hot-reloader (this is dev only feature)
    // With when the app runs for multi-zones support behind a proxy,
    // the current page is trying to access this URL via assetPrefix.
    // That's when the CORS support is needed.
    const { preflight } = addCorsSupport(req, res)
    if (preflight) {
      return
    }

    // When a request comes in that is a page bundle, e.g. /_next/static/<buildid>/pages/index.js
    // we have to compile the page using on-demand-entries, this middleware will handle doing that
    // by adding the page to on-demand-entries, waiting till it's done
    // and then the bundle will be served like usual by the actual route in server/index.js
    const handlePageBundleRequest = async (
      res: ServerResponse,
      parsedUrl: UrlObject
    ) => {
      const { pathname } = parsedUrl
      const params = matchNextPageBundleRequest(pathname)
      if (!params) {
        return {}
      }

      if (params.buildId !== this.buildId) {
        return
      }

      const page = `/${params.path.join('/')}`
      if (page === '/_error' || BLOCKED_PAGES.indexOf(page) === -1) {
        try {
          await this.ensurePage(page)
        } catch (error) {
          await renderScriptError(res, error)
          return { finished: true }
        }

        const bundlePath = join(
          this.dir,
          this.config.distDir,
          'server/static/development/pages',
          page + '.js'
        )

        // Make sure to 404 for AMP first pages
        try {
          const mod = require(bundlePath)
          if (mod?.config?.amp === true) {
            res.statusCode = 404
            res.end()
            return { finished: true }
          }
        } catch (_) {}

        const errors = await this.getCompilationErrors(page)
        if (errors.length > 0) {
          await renderScriptError(res, errors[0])
          return { finished: true }
        }
      }

      return {}
    }

    const { finished } = (await handlePageBundleRequest(res, parsedUrl)) as any

    for (const fn of this.middlewares) {
      await new Promise((resolve, reject) => {
        fn(req, res, (err: Error) => {
          if (err) return reject(err)
          resolve()
        })
      })
    }

    return { finished }
  }

  async clean() {
    return recursiveDelete(join(this.dir, this.config.distDir), /^cache/)
  }

  async getWebpackConfig() {
    const pagePaths = await Promise.all([
      findPageFile(this.pagesDir, '/_app', this.config.pageExtensions),
      findPageFile(this.pagesDir, '/_document', this.config.pageExtensions),
    ])

    const pages = createPagesMapping(
      pagePaths.filter(i => i !== null) as string[],
      this.config.pageExtensions
    )
    const entrypoints = createEntrypoints(
      pages,
      'server',
      this.buildId,
      this.previewProps,
      this.config
    )

    let additionalClientEntrypoints: { [file: string]: string } = {}
    additionalClientEntrypoints[CLIENT_STATIC_FILES_RUNTIME_AMP] =
      `.${sep}` +
      relativePath(
        this.dir,
        join(NEXT_PROJECT_ROOT_DIST_CLIENT, 'dev', 'amp-dev')
      )

    return Promise.all([
      getBaseWebpackConfig(this.dir, {
        dev: true,
        isServer: false,
        config: this.config,
        buildId: this.buildId,
        pagesDir: this.pagesDir,
        entrypoints: { ...entrypoints.client, ...additionalClientEntrypoints },
      }),
      getBaseWebpackConfig(this.dir, {
        dev: true,
        isServer: true,
        config: this.config,
        buildId: this.buildId,
        pagesDir: this.pagesDir,
        entrypoints: entrypoints.server,
      }),
    ])
  }

  async start() {
    await this.clean()

    const configs = await this.getWebpackConfig()

    const multiCompiler = webpack(configs)

    const buildTools = await this.prepareBuildTools(multiCompiler)
    this.assignBuildTools(buildTools)

    this.stats = ((await this.waitUntilValid()) as any).stats[0]
  }

  async stop(webpackDevMiddleware?: WebpackDevMiddleware.WebpackDevMiddleware) {
    const middleware = webpackDevMiddleware || this.webpackDevMiddleware
    if (middleware) {
      return new Promise((resolve, reject) => {
        ;(middleware.close as any)((err: any) => {
          if (err) return reject(err)
          resolve()
        })
      })
    }
  }

  async reload() {
    this.stats = null

    await this.clean()

    const configs = await this.getWebpackConfig()
    const compiler = webpack(configs)

    const buildTools = await this.prepareBuildTools(compiler)
    this.stats = await this.waitUntilValid(buildTools.webpackDevMiddleware)

    const oldWebpackDevMiddleware = this.webpackDevMiddleware

    this.assignBuildTools(buildTools)
    await this.stop(oldWebpackDevMiddleware!)
  }

  assignBuildTools({
    webpackDevMiddleware,
    webpackHotMiddleware,
    onDemandEntries,
  }: {
    webpackDevMiddleware: WebpackDevMiddleware.WebpackDevMiddleware
    webpackHotMiddleware: NextHandleFunction & WebpackHotMiddleware.EventStream
    onDemandEntries: any
  }) {
    this.webpackDevMiddleware = webpackDevMiddleware
    this.webpackHotMiddleware = webpackHotMiddleware
    this.onDemandEntries = onDemandEntries
    this.middlewares = [
      webpackDevMiddleware,
      // must come before hotMiddleware
      onDemandEntries.middleware(),
      webpackHotMiddleware,
      errorOverlayMiddleware({ dir: this.dir }),
    ]
  }

  async prepareBuildTools(multiCompiler: webpack.MultiCompiler) {
    const tsConfigPath = join(this.dir, 'tsconfig.json')
    const useTypeScript = await fileExists(tsConfigPath)
    const ignoreTypeScriptErrors =
      this.config.typescript && this.config.typescript.ignoreDevErrors

    watchCompilers(
      multiCompiler.compilers[0],
      multiCompiler.compilers[1],
      useTypeScript && !ignoreTypeScriptErrors,
      ({ errors, warnings }) => this.send('typeChecked', { errors, warnings })
    )

    // This plugin watches for changes to _document.js and notifies the client side that it should reload the page
    multiCompiler.compilers[1].hooks.done.tap(
      'NextjsHotReloaderForServer',
      stats => {
        if (!this.initialized) {
          return
        }

        const { compilation } = stats

        // We only watch `_document` for changes on the server compilation
        // the rest of the files will be triggered by the client compilation
        const documentChunk = compilation.chunks.find(
          c => c.name === normalize(`static/${this.buildId}/pages/_document.js`)
        )
        // If the document chunk can't be found we do nothing
        if (!documentChunk) {
          console.warn('_document.js chunk not found')
          return
        }

        // Initial value
        if (this.serverPrevDocumentHash === null) {
          this.serverPrevDocumentHash = documentChunk.hash
          return
        }

        // If _document.js didn't change we don't trigger a reload
        if (documentChunk.hash === this.serverPrevDocumentHash) {
          return
        }

        // Notify reload to reload the page, as _document.js was changed (different hash)
        this.send('reloadPage')
        this.serverPrevDocumentHash = documentChunk.hash
      }
    )

    multiCompiler.compilers[0].hooks.done.tap(
      'NextjsHotReloaderForClient',
      stats => {
        const { compilation } = stats
        const chunkNames = new Set(
          compilation.chunks
            .map(c => c.name)
            .filter(name => IS_BUNDLED_PAGE_REGEX.test(name))
        )

        if (this.initialized) {
          // detect chunks which have to be replaced with a new template
          // e.g, pages/index.js <-> pages/_error.js
          const addedPages = diff(chunkNames, this.prevChunkNames!)
          const removedPages = diff(this.prevChunkNames!, chunkNames)

          if (addedPages.size > 0) {
            for (const addedPage of addedPages) {
              let page =
                '/' + ROUTE_NAME_REGEX.exec(addedPage)![1].replace(/\\/g, '/')
              page = page === '/index' ? '/' : page
              this.send('addedPage', page)
            }
          }

          if (removedPages.size > 0) {
            for (const removedPage of removedPages) {
              let page =
                '/' + ROUTE_NAME_REGEX.exec(removedPage)![1].replace(/\\/g, '/')
              page = page === '/index' ? '/' : page
              this.send('removedPage', page)
            }
          }
        }

        this.initialized = true
        this.stats = stats
        this.prevChunkNames = chunkNames
      }
    )

    // We don’t watch .git/ .next/ and node_modules for changes
    const ignored = [
      /[\\/]\.git[\\/]/,
      /[\\/]\.next[\\/]/,
      /[\\/]node_modules[\\/]/,
    ]

    let webpackDevMiddlewareConfig = {
      publicPath: `/_next/static/webpack`,
      noInfo: true,
      logLevel: 'silent',
      watchOptions: { ignored },
      writeToDisk: true,
    }

    if (this.config.webpackDevMiddleware) {
      console.log(
        `> Using "webpackDevMiddleware" config function defined in ${this.config.configOrigin}.`
      )
      webpackDevMiddlewareConfig = this.config.webpackDevMiddleware(
        webpackDevMiddlewareConfig
      )
    }

    const webpackDevMiddleware = WebpackDevMiddleware(
      multiCompiler,
      webpackDevMiddlewareConfig
    )

    const webpackHotMiddleware = WebpackHotMiddleware(
      multiCompiler.compilers[0],
      {
        path: '/_next/webpack-hmr',
        log: false,
        heartbeat: 2500,
      }
    )

    const onDemandEntries = onDemandEntryHandler(
      webpackDevMiddleware,
      multiCompiler,
      {
        dir: this.dir,
        buildId: this.buildId,
        pagesDir: this.pagesDir,
        distDir: this.config.distDir,
        reload: this.reload.bind(this),
        pageExtensions: this.config.pageExtensions,
        publicRuntimeConfig: this.config.publicRuntimeConfig,
        serverRuntimeConfig: this.config.serverRuntimeConfig,
        ...this.config.onDemandEntries,
      }
    )

    return {
      webpackDevMiddleware,
      webpackHotMiddleware,
      onDemandEntries,
    }
  }

  waitUntilValid(
    webpackDevMiddleware?: WebpackDevMiddleware.WebpackDevMiddleware
  ) {
    const middleware = webpackDevMiddleware || this.webpackDevMiddleware
    return new Promise(resolve => {
      middleware!.waitUntilValid(resolve)
    })
  }

  async getCompilationErrors(page: string) {
    const normalizedPage = normalizePage(page)
    // When we are reloading, we need to wait until it's reloaded properly.
    await this.onDemandEntries.waitUntilReloaded()

    if (this.stats.hasErrors()) {
      const { compilation } = this.stats
      const failedPages = erroredPages(compilation, {
        enhanceName(name) {
          return '/' + ROUTE_NAME_REGEX.exec(name)![1]
        },
      })

      // If there is an error related to the requesting page we display it instead of the first error
      if (
        failedPages[normalizedPage] &&
        failedPages[normalizedPage].length > 0
      ) {
        return failedPages[normalizedPage]
      }

      // If none were found we still have to show the other errors
      return this.stats.compilation.errors
    }

    return []
  }

  send = (action: string, ...args: any[]) => {
    this.webpackHotMiddleware!.publish({ action, data: args })
  }

  async ensurePage(page: string) {
    // Make sure we don't re-build or dispose prebuilt pages
    if (page !== '/_error' && BLOCKED_PAGES.indexOf(page) !== -1) {
      return
    }
    return this.onDemandEntries.ensurePage(page)
  }
}

function diff(a: Set<any>, b: Set<any>) {
  return new Set([...a].filter(v => !b.has(v)))
}
