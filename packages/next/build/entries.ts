import chalk from 'next/dist/compiled/chalk'
import { join } from 'path'
import { stringify } from 'querystring'
import { API_ROUTE, DOT_NEXT_ALIAS, PAGES_DIR_ALIAS } from '../lib/constants'
import { __ApiPreviewProps } from '../next-server/server/api-utils'
import { isTargetLikeServerless } from '../next-server/server/config'
import { normalizePagePath } from '../next-server/server/normalize-page-path'
import { warn } from './output/log'
import { ServerlessLoaderQuery } from './webpack/loaders/next-serverless-loader'

type PagesMapping = {
  [page: string]: string
}

export function createPagesMapping(
  pagePaths: string[],
  extensions: string[]
): PagesMapping {
  const previousPages: PagesMapping = {}
  const pages: PagesMapping = pagePaths.reduce(
    (result: PagesMapping, pagePath): PagesMapping => {
      let page = `${pagePath
        .replace(new RegExp(`\\.+(${extensions.join('|')})$`), '')
        .replace(/\\/g, '/')}`.replace(/\/index$/, '')
      page = page === '/index' ? '/' : page

      const pageKey = page === '' ? '/' : page

      if (pageKey in result) {
        warn(
          `Duplicate page detected. ${chalk.cyan(
            join('pages', previousPages[pageKey])
          )} and ${chalk.cyan(
            join('pages', pagePath)
          )} both resolve to ${chalk.cyan(pageKey)}.`
        )
      } else {
        previousPages[pageKey] = pagePath
      }
      result[pageKey] = join(PAGES_DIR_ALIAS, pagePath).replace(/\\/g, '/')
      return result
    },
    {}
  )

  pages['/_app'] = pages['/_app'] || 'next/dist/pages/_app'
  pages['/_error'] = pages['/_error'] || 'next/dist/pages/_error'
  pages['/_document'] = pages['/_document'] || 'next/dist/pages/_document'

  return pages
}

export type WebpackEntrypoints = {
  [bundle: string]: string | string[]
}

type Entrypoints = {
  client: WebpackEntrypoints
  server: WebpackEntrypoints
}

export function createEntrypoints(
  pages: PagesMapping,
  target: 'server' | 'serverless' | 'experimental-serverless-trace',
  buildId: string,
  previewMode: __ApiPreviewProps,
  config: any
): Entrypoints {
  const client: WebpackEntrypoints = {}
  const server: WebpackEntrypoints = {}

  const hasRuntimeConfig =
    Object.keys(config.publicRuntimeConfig).length > 0 ||
    Object.keys(config.serverRuntimeConfig).length > 0

  const defaultServerlessOptions = {
    absoluteAppPath: pages['/_app'],
    absoluteDocumentPath: pages['/_document'],
    absoluteErrorPath: pages['/_error'],
    distDir: DOT_NEXT_ALIAS,
    buildId,
    assetPrefix: config.assetPrefix,
    generateEtags: config.generateEtags,
    canonicalBase: config.canonicalBase,
    basePath: config.experimental.basePath,
    runtimeConfig: hasRuntimeConfig
      ? JSON.stringify({
          publicRuntimeConfig: config.publicRuntimeConfig,
          serverRuntimeConfig: config.serverRuntimeConfig,
        })
      : '',
    previewProps: JSON.stringify(previewMode),
  }

  Object.keys(pages).forEach(page => {
    const absolutePagePath = pages[page]
    const bundleFile = `${normalizePagePath(page)}.js`
    const isApiRoute = page.match(API_ROUTE)

    const bundlePath = join('static', buildId, 'pages', bundleFile)

    const isLikeServerless = isTargetLikeServerless(target)

    if (isApiRoute && isLikeServerless) {
      const serverlessLoaderOptions: ServerlessLoaderQuery = {
        page,
        absolutePagePath,
        ...defaultServerlessOptions,
      }
      server[join('pages', bundleFile)] = `next-serverless-loader?${stringify(
        serverlessLoaderOptions
      )}!`
    } else if (isApiRoute || target === 'server') {
      server[bundlePath] = [absolutePagePath]
    } else if (isLikeServerless && page !== '/_app' && page !== '/_document') {
      const serverlessLoaderOptions: ServerlessLoaderQuery = {
        page,
        absolutePagePath,
        ...defaultServerlessOptions,
      }
      server[join('pages', bundleFile)] = `next-serverless-loader?${stringify(
        serverlessLoaderOptions
      )}!`
    }

    if (page === '/_document') {
      return
    }

    if (!isApiRoute) {
      const pageLoader = `next-client-pages-loader?${stringify({
        page,
        absolutePagePath,
      })}!`

      // Make sure next/router is a dependency of _app or else granularChunks
      // might cause the router to not be able to load causing hydration
      // to fail

      client[bundlePath] =
        page === '/_app'
          ? [pageLoader, require.resolve('../client/router')]
          : pageLoader
    }
  })

  return {
    client,
    server,
  }
}
