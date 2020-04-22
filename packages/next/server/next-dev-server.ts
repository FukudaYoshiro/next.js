import AmpHtmlValidator from 'next/dist/compiled/amphtml-validator'
import crypto from 'crypto'
import findUp from 'next/dist/compiled/find-up'
import fs from 'fs'
import { IncomingMessage, ServerResponse } from 'http'
import Worker from 'jest-worker'
import { join, relative, resolve, sep } from 'path'
import React from 'react'
import { UrlWithParsedQuery } from 'url'
import { promisify } from 'util'
import Watchpack from 'watchpack'
import { ampValidation } from '../build/output/index'
import * as Log from '../build/output/log'
import checkCustomRoutes from '../lib/check-custom-routes'
import { PUBLIC_DIR_MIDDLEWARE_CONFLICT } from '../lib/constants'
import { findPagesDir } from '../lib/find-pages-dir'
import { verifyTypeScriptSetup } from '../lib/verifyTypeScriptSetup'
import { PHASE_DEVELOPMENT_SERVER } from '../next-server/lib/constants'
import {
  getRouteMatcher,
  getRouteRegex,
  getSortedRoutes,
  isDynamicRoute,
} from '../next-server/lib/router/utils'
import { __ApiPreviewProps } from '../next-server/server/api-utils'
import Server, { ServerConstructor } from '../next-server/server/next-server'
import { normalizePagePath } from '../next-server/server/normalize-page-path'
import Router, { Params, route } from '../next-server/server/router'
import { eventCliSession } from '../telemetry/events'
import { Telemetry } from '../telemetry/storage'
import ErrorDebug from './error-debug'
import HotReloader from './hot-reloader'
import { findPageFile } from './lib/find-page-file'
import { getNodeOptionsWithoutInspect } from './lib/utils'

if (typeof React.Suspense === 'undefined') {
  throw new Error(
    `The version of React you are using is lower than the minimum required version needed for Next.js. Please upgrade "react" and "react-dom": "npm install react react-dom" https://err.sh/zeit/next.js/invalid-react-version`
  )
}

const fsStat = promisify(fs.stat)

export default class DevServer extends Server {
  private devReady: Promise<void>
  private setDevReady?: Function
  private webpackWatcher?: Watchpack | null
  private hotReloader?: HotReloader
  private isCustomServer: boolean

  constructor(options: ServerConstructor & { isNextDevCommand?: boolean }) {
    super({ ...options, dev: true })
    this.renderOpts.dev = true
    ;(this.renderOpts as any).ErrorDebug = ErrorDebug
    this.devReady = new Promise(resolve => {
      this.setDevReady = resolve
    })
    ;(this.renderOpts as any).ampSkipValidation =
      this.nextConfig.experimental?.amp?.skipValidation ?? false
    ;(this.renderOpts as any).ampValidator = (
      html: string,
      pathname: string
    ) => {
      const validatorPath =
        this.nextConfig.experimental &&
        this.nextConfig.experimental.amp &&
        this.nextConfig.experimental.amp.validator
      return AmpHtmlValidator.getInstance(validatorPath).then(validator => {
        const result = validator.validateString(html)
        ampValidation(
          pathname,
          result.errors
            .filter(e => e.severity === 'ERROR')
            .filter(e => this._filterAmpDevelopmentScript(html, e)),
          result.errors.filter(e => e.severity !== 'ERROR')
        )
      })
    }
    if (fs.existsSync(join(this.dir, 'static'))) {
      console.warn(
        `The static directory has been deprecated in favor of the public directory. https://err.sh/zeit/next.js/static-dir-deprecated`
      )
    }
    this.isCustomServer = !options.isNextDevCommand
    this.pagesDir = findPagesDir(this.dir)
    this.staticPathsWorker = new Worker(
      require.resolve('./static-paths-worker'),
      {
        maxRetries: 0,
        numWorkers: this.nextConfig.experimental.cpus,
        forkOptions: {
          env: {
            ...process.env,
            // discard --inspect/--inspect-brk flags from process.env.NODE_OPTIONS. Otherwise multiple Node.js debuggers
            // would be started if user launch Next.js in debugging mode. The number of debuggers is linked to
            // the number of workers Next.js tries to launch. The only worker users are interested in debugging
            // is the main Next.js one
            NODE_OPTIONS: getNodeOptionsWithoutInspect(),
          },
        },
      }
    ) as Worker & {
      loadStaticPaths: typeof import('./static-paths-worker').loadStaticPaths
    }

    this.staticPathsWorker.getStdout().pipe(process.stdout)
    this.staticPathsWorker.getStderr().pipe(process.stderr)
  }

  protected currentPhase() {
    return PHASE_DEVELOPMENT_SERVER
  }

  protected readBuildId() {
    return 'development'
  }

  async addExportPathMapRoutes() {
    // Makes `next export` exportPathMap work in development mode.
    // So that the user doesn't have to define a custom server reading the exportPathMap
    if (this.nextConfig.exportPathMap) {
      console.log('Defining routes from exportPathMap')
      const exportPathMap = await this.nextConfig.exportPathMap(
        {},
        {
          dev: true,
          dir: this.dir,
          outDir: null,
          distDir: this.distDir,
          buildId: this.buildId,
        }
      ) // In development we can't give a default path mapping
      for (const path in exportPathMap) {
        const { page, query = {} } = exportPathMap[path]

        // We use unshift so that we're sure the routes is defined before Next's default routes
        this.router.addFsRoute({
          match: route(path),
          type: 'route',
          name: `${path} exportpathmap route`,
          fn: async (req, res, params, parsedUrl) => {
            const { query: urlQuery } = parsedUrl

            Object.keys(urlQuery)
              .filter(key => query[key] === undefined)
              .forEach(key =>
                console.warn(
                  `Url '${path}' defines a query parameter '${key}' that is missing in exportPathMap`
                )
              )

            const mergedQuery = { ...urlQuery, ...query }

            await this.render(req, res, page, mergedQuery, parsedUrl)
            return {
              finished: true,
            }
          },
        })
      }
    }
  }

  async startWatcher() {
    if (this.webpackWatcher) {
      return
    }

    const regexPageExtension = new RegExp(
      `\\.+(?:${this.nextConfig.pageExtensions.join('|')})$`
    )

    let resolved = false
    return new Promise(resolve => {
      const pagesDir = this.pagesDir

      // Watchpack doesn't emit an event for an empty directory
      fs.readdir(pagesDir!, (_, files) => {
        if (files?.length) {
          return
        }

        if (!resolved) {
          resolve()
          resolved = true
        }
      })

      let wp = (this.webpackWatcher = new Watchpack())
      wp.watch([], [pagesDir!], 0)

      wp.on('aggregated', () => {
        const dynamicRoutedPages = []
        const knownFiles = wp.getTimeInfoEntries()
        for (const [fileName, { accuracy }] of knownFiles) {
          if (accuracy === undefined || !regexPageExtension.test(fileName)) {
            continue
          }

          let pageName =
            '/' + relative(pagesDir!, fileName).replace(/\\+/g, '/')
          pageName = pageName.replace(regexPageExtension, '')
          pageName = pageName.replace(/\/index$/, '') || '/'

          if (!isDynamicRoute(pageName)) {
            continue
          }

          dynamicRoutedPages.push(pageName)
        }

        this.dynamicRoutes = getSortedRoutes(dynamicRoutedPages).map(page => ({
          page,
          match: getRouteMatcher(getRouteRegex(page)),
        }))
        this.router.setDynamicRoutes(this.dynamicRoutes)

        if (!resolved) {
          resolve()
          resolved = true
        }
      })
    })
  }

  async stopWatcher() {
    if (!this.webpackWatcher) {
      return
    }

    this.webpackWatcher.close()
    this.webpackWatcher = null
  }

  async prepare() {
    await verifyTypeScriptSetup(this.dir, this.pagesDir!)
    await this.loadCustomRoutes()

    if (this.customRoutes) {
      const { redirects, rewrites, headers } = this.customRoutes

      if (redirects.length || rewrites.length || headers.length) {
        this.router = new Router(this.generateRoutes())
      }
    }

    this.hotReloader = new HotReloader(this.dir, {
      pagesDir: this.pagesDir!,
      config: this.nextConfig,
      previewProps: this.getPreviewProps(),
      buildId: this.buildId,
    })
    await super.prepare()
    await this.addExportPathMapRoutes()
    await this.hotReloader.start()
    await this.startWatcher()
    this.setDevReady!()

    const telemetry = new Telemetry({ distDir: this.distDir })
    telemetry.record(
      eventCliSession(PHASE_DEVELOPMENT_SERVER, this.distDir, {
        cliCommand: 'dev',
        isSrcDir: relative(this.dir, this.pagesDir!).startsWith('src'),
        hasNowJson: !!(await findUp('now.json', { cwd: this.dir })),
        isCustomServer: this.isCustomServer,
      })
    )
  }

  protected async close() {
    await this.stopWatcher()
    if (this.hotReloader) {
      await this.hotReloader.stop()
    }
  }

  protected async hasPage(pathname: string): Promise<boolean> {
    const pageFile = await findPageFile(
      this.pagesDir!,
      normalizePagePath(pathname),
      this.nextConfig.pageExtensions
    )
    return !!pageFile
  }

  protected async _beforeCatchAllRender(
    req: IncomingMessage,
    res: ServerResponse,
    params: Params,
    parsedUrl: UrlWithParsedQuery
  ) {
    const { pathname } = parsedUrl
    const pathParts = params.path || []
    const path = `/${pathParts.join('/')}`
    // check for a public file, throwing error if there's a
    // conflicting page
    if (await this.hasPublicFile(path)) {
      if (await this.hasPage(pathname!)) {
        const err = new Error(
          `A conflicting public file and page file was found for path ${pathname} https://err.sh/zeit/next.js/conflicting-public-file-page`
        )
        res.statusCode = 500
        await this.renderError(err, req, res, pathname!, {})
        return true
      }
      await this.servePublic(req, res, pathParts)
      return true
    }

    return false
  }

  async run(
    req: IncomingMessage,
    res: ServerResponse,
    parsedUrl: UrlWithParsedQuery
  ) {
    await this.devReady
    const { pathname } = parsedUrl

    if (pathname!.startsWith('/_next')) {
      try {
        await fsStat(join(this.publicDir, '_next'))
        throw new Error(PUBLIC_DIR_MIDDLEWARE_CONFLICT)
      } catch (err) {}
    }

    const { finished } = (await this.hotReloader!.run(req, res, parsedUrl)) || {
      finished: false,
    }
    if (finished) {
      return
    }

    return super.run(req, res, parsedUrl)
  }

  // override production loading of routes-manifest
  protected getCustomRoutes() {
    return this.customRoutes
  }

  private _devCachedPreviewProps: __ApiPreviewProps | undefined
  protected getPreviewProps() {
    if (this._devCachedPreviewProps) {
      return this._devCachedPreviewProps
    }
    return (this._devCachedPreviewProps = {
      previewModeId: crypto.randomBytes(16).toString('hex'),
      previewModeSigningKey: crypto.randomBytes(32).toString('hex'),
      previewModeEncryptionKey: crypto.randomBytes(32).toString('hex'),
    })
  }

  private async loadCustomRoutes() {
    const result = {
      redirects: [],
      rewrites: [],
      headers: [],
    }
    const { redirects, rewrites, headers } = this.nextConfig.experimental

    if (typeof redirects === 'function') {
      result.redirects = await redirects()
      checkCustomRoutes(result.redirects, 'redirect')
    }
    if (typeof rewrites === 'function') {
      result.rewrites = await rewrites()
      checkCustomRoutes(result.rewrites, 'rewrite')
    }
    if (typeof headers === 'function') {
      result.headers = await headers()
      checkCustomRoutes(result.headers, 'header')
    }

    this.customRoutes = result
  }

  generateRoutes() {
    const { fsRoutes, ...otherRoutes } = super.generateRoutes()

    // In development we expose all compiled files for react-error-overlay's line show feature
    // We use unshift so that we're sure the routes is defined before Next's default routes
    fsRoutes.unshift({
      match: route('/_next/development/:path*'),
      type: 'route',
      name: '_next/development catchall',
      fn: async (req, res, params) => {
        const p = join(this.distDir, ...(params.path || []))
        await this.serveStatic(req, res, p)
        return {
          finished: true,
        }
      },
    })

    fsRoutes.push({
      match: route('/:path*'),
      type: 'route',
      name: 'Catchall public directory route',
      fn: async (req, res, params, parsedUrl) => {
        const { pathname } = parsedUrl
        if (!pathname) {
          throw new Error('pathname is undefined')
        }

        // Used in development to check public directory paths
        if (await this._beforeCatchAllRender(req, res, params, parsedUrl)) {
          return {
            finished: true,
          }
        }

        return {
          finished: false,
        }
      },
    })

    return { fsRoutes, ...otherRoutes }
  }

  // In development public files are not added to the router but handled as a fallback instead
  protected generatePublicRoutes() {
    return []
  }

  // In development dynamic routes cannot be known ahead of time
  protected getDynamicRoutes() {
    return []
  }

  _filterAmpDevelopmentScript(
    html: string,
    event: { line: number; col: number; code: string }
  ) {
    if (event.code !== 'DISALLOWED_SCRIPT_TAG') {
      return true
    }

    const snippetChunks = html.split('\n')

    let snippet
    if (
      !(snippet = html.split('\n')[event.line - 1]) ||
      !(snippet = snippet.substring(event.col))
    ) {
      return true
    }

    snippet = snippet + snippetChunks.slice(event.line).join('\n')
    snippet = snippet.substring(0, snippet.indexOf('</script>'))

    return !snippet.includes('data-amp-development-mode-only')
  }

  protected async ensureApiPage(pathname: string) {
    return this.hotReloader!.ensurePage(pathname)
  }

  async renderToHTML(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    query: { [key: string]: string }
  ) {
    const compilationErr = await this.getCompilationError(pathname)
    if (compilationErr) {
      res.statusCode = 500
      return this.renderErrorToHTML(compilationErr, req, res, pathname, query)
    }

    // In dev mode we use on demand entries to compile the page before rendering
    try {
      await this.hotReloader!.ensurePage(pathname).catch(async (err: Error) => {
        if ((err as any).code !== 'ENOENT') {
          throw err
        }

        for (const dynamicRoute of this.dynamicRoutes || []) {
          const params = dynamicRoute.match(pathname)
          if (!params) {
            continue
          }

          return this.hotReloader!.ensurePage(dynamicRoute.page)
        }
        throw err
      })
    } catch (err) {
      if (err.code === 'ENOENT') {
        try {
          await this.hotReloader!.ensurePage('/404')
        } catch (err) {
          if (err.code !== 'ENOENT') {
            throw err
          }
        }

        res.statusCode = 404
        return this.renderErrorToHTML(null, req, res, pathname, query)
      }
      if (!this.quiet) console.error(err)
    }
    const html = await super.renderToHTML(req, res, pathname, query)
    return html
  }

  async renderErrorToHTML(
    err: Error | null,
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    query: { [key: string]: string }
  ) {
    if (res.statusCode === 404 && (await this.hasPage('/404'))) {
      await this.hotReloader!.ensurePage('/404')
    } else {
      await this.hotReloader!.ensurePage('/_error')
    }

    const compilationErr = await this.getCompilationError(pathname)
    if (compilationErr) {
      res.statusCode = 500
      return super.renderErrorToHTML(compilationErr, req, res, pathname, query)
    }

    if (!err && res.statusCode === 500) {
      err = new Error(
        'An undefined error was thrown sometime during render... ' +
          'See https://err.sh/zeit/next.js/threw-undefined'
      )
    }

    try {
      const out = await super.renderErrorToHTML(err, req, res, pathname, query)
      return out
    } catch (err2) {
      if (!this.quiet) Log.error(err2)
      res.statusCode = 500
      return super.renderErrorToHTML(err2, req, res, pathname, query)
    }
  }

  sendHTML(req: IncomingMessage, res: ServerResponse, html: string) {
    // In dev, we should not cache pages for any reason.
    res.setHeader('Cache-Control', 'no-store, must-revalidate')
    return super.sendHTML(req, res, html)
  }

  protected setImmutableAssetCacheControl(res: ServerResponse) {
    res.setHeader('Cache-Control', 'no-store, must-revalidate')
  }

  private servePublic(
    req: IncomingMessage,
    res: ServerResponse,
    pathParts: string[]
  ) {
    const p = join(this.publicDir, ...pathParts.map(encodeURIComponent))
    return this.serveStatic(req, res, p)
  }

  async hasPublicFile(path: string) {
    try {
      const info = await fsStat(join(this.publicDir, path))
      return info.isFile()
    } catch (_) {
      return false
    }
  }

  async getCompilationError(page: string) {
    const errors = await this.hotReloader!.getCompilationErrors(page)
    if (errors.length === 0) return

    // Return the very first error we found.
    return errors[0]
  }

  protected isServeableUrl(untrustedFileUrl: string): boolean {
    // This method mimics what the version of `send` we use does:
    // 1. decodeURIComponent:
    //    https://github.com/pillarjs/send/blob/0.17.1/index.js#L989
    //    https://github.com/pillarjs/send/blob/0.17.1/index.js#L518-L522
    // 2. resolve:
    //    https://github.com/pillarjs/send/blob/de073ed3237ade9ff71c61673a34474b30e5d45b/index.js#L561

    let decodedUntrustedFilePath: string
    try {
      // (1) Decode the URL so we have the proper file name
      decodedUntrustedFilePath = decodeURIComponent(untrustedFileUrl)
    } catch {
      return false
    }

    // (2) Resolve "up paths" to determine real request
    const untrustedFilePath = resolve(decodedUntrustedFilePath)

    // don't allow null bytes anywhere in the file path
    if (untrustedFilePath.indexOf('\0') !== -1) {
      return false
    }

    // During development mode, files can be added while the server is running.
    // Checks for .next/static, .next/server, static and public.
    // Note that in development .next/server is available for error reporting purposes.
    // see `packages/next/next-server/server/next-server.ts` for more details.
    if (
      untrustedFilePath.startsWith(join(this.distDir, 'static') + sep) ||
      untrustedFilePath.startsWith(join(this.distDir, 'server') + sep) ||
      untrustedFilePath.startsWith(join(this.dir, 'static') + sep) ||
      untrustedFilePath.startsWith(join(this.dir, 'public') + sep)
    ) {
      return true
    }

    return false
  }
}
