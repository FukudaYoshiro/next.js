import { IncomingMessage, ServerResponse } from 'http'
import { ParsedUrlQuery } from 'querystring'
import React from 'react'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { UnwrapPromise } from '../../lib/coalesced-function'
import {
  GSP_NO_RETURNED_VALUE,
  GSSP_COMPONENT_MEMBER_ERROR,
  GSSP_NO_RETURNED_VALUE,
  PAGES_404_GET_INITIAL_PROPS_ERROR,
  SERVER_PROPS_GET_INIT_PROPS_CONFLICT,
  SERVER_PROPS_SSG_CONFLICT,
  SSG_GET_INITIAL_PROPS_CONFLICT,
  UNSTABLE_REVALIDATE_RENAME_ERROR,
} from '../../lib/constants'
import { isSerializableProps } from '../../lib/is-serializable-props'
import { GetServerSideProps, GetStaticProps } from '../../types'
import { isInAmpMode } from '../lib/amp'
import { AmpStateContext } from '../lib/amp-context'
import {
  AMP_RENDER_TARGET,
  SERVER_PROPS_ID,
  STATIC_PROPS_ID,
} from '../lib/constants'
import { defaultHead } from '../lib/head'
import { HeadManagerContext } from '../lib/head-manager-context'
import Loadable from '../lib/loadable'
import { LoadableContext } from '../lib/loadable-context'
import mitt, { MittEmitter } from '../lib/mitt'
import { RouterContext } from '../lib/router-context'
import { NextRouter } from '../lib/router/router'
import { isDynamicRoute } from '../lib/router/utils/is-dynamic'
import {
  AppType,
  ComponentsEnhancer,
  DocumentInitialProps,
  DocumentType,
  getDisplayName,
  isResSent,
  loadGetInitialProps,
  NextComponentType,
  RenderPage,
} from '../lib/utils'
import { tryGetPreviewData, __ApiPreviewProps } from './api-utils'
import { getPageFiles } from './get-page-files'
import { LoadComponentsReturnType, ManifestItem } from './load-components'
import optimizeAmp from './optimize-amp'

function noRouter() {
  const message =
    'No router instance found. you should only use "next/router" inside the client side of your app. https://err.sh/vercel/next.js/no-router-instance'
  throw new Error(message)
}

class ServerRouter implements NextRouter {
  route: string
  pathname: string
  query: ParsedUrlQuery
  asPath: string
  basePath: string
  events: any
  isFallback: boolean
  // TODO: Remove in the next major version, as this would mean the user is adding event listeners in server-side `render` method
  static events: MittEmitter = mitt()

  constructor(
    pathname: string,
    query: ParsedUrlQuery,
    as: string,
    { isFallback }: { isFallback: boolean },
    basePath: string
  ) {
    this.route = pathname.replace(/\/$/, '') || '/'
    this.pathname = pathname
    this.query = query
    this.asPath = as
    this.isFallback = isFallback
    this.basePath = basePath
  }
  push(): any {
    noRouter()
  }
  replace(): any {
    noRouter()
  }
  reload() {
    noRouter()
  }
  back() {
    noRouter()
  }
  prefetch(): any {
    noRouter()
  }
  beforePopState() {
    noRouter()
  }
}

function enhanceComponents(
  options: ComponentsEnhancer,
  App: AppType,
  Component: NextComponentType
): {
  App: AppType
  Component: NextComponentType
} {
  // For backwards compatibility
  if (typeof options === 'function') {
    return {
      App,
      Component: options(Component),
    }
  }

  return {
    App: options.enhanceApp ? options.enhanceApp(App) : App,
    Component: options.enhanceComponent
      ? options.enhanceComponent(Component)
      : Component,
  }
}

export type RenderOptsPartial = {
  buildId: string
  canonicalBase: string
  runtimeConfig?: { [key: string]: any }
  assetPrefix?: string
  err?: Error | null
  autoExport?: boolean
  nextExport?: boolean
  dev?: boolean
  ampMode?: any
  ampPath?: string
  inAmpMode?: boolean
  hybridAmp?: boolean
  ErrorDebug?: React.ComponentType<{ error: Error }>
  ampValidator?: (html: string, pathname: string) => Promise<void>
  ampSkipValidation?: boolean
  ampOptimizerConfig?: { [key: string]: any }
  isDataReq?: boolean
  params?: ParsedUrlQuery
  previewProps: __ApiPreviewProps
  basePath: string
  unstable_runtimeJS?: false
}

export type RenderOpts = LoadComponentsReturnType & RenderOptsPartial

function renderDocument(
  Document: DocumentType,
  {
    buildManifest,
    props,
    docProps,
    pathname,
    query,
    buildId,
    canonicalBase,
    assetPrefix,
    runtimeConfig,
    nextExport,
    autoExport,
    isFallback,
    dynamicImportsIds,
    dangerousAsPath,
    err,
    dev,
    ampPath,
    ampState,
    inAmpMode,
    hybridAmp,
    files,
    dynamicImports,
    headTags,
    gsp,
    gssp,
    customServer,
    gip,
    appGip,
    unstable_runtimeJS,
  }: RenderOpts & {
    props: any
    docProps: DocumentInitialProps
    pathname: string
    query: ParsedUrlQuery
    dangerousAsPath: string
    ampState: any
    ampPath: string
    inAmpMode: boolean
    hybridAmp: boolean
    dynamicImportsIds: string[]
    dynamicImports: ManifestItem[]
    files: string[]
    headTags: any
    isFallback?: boolean
    gsp?: boolean
    gssp?: boolean
    customServer?: boolean
    gip?: boolean
    appGip?: boolean
  }
): string {
  return (
    '<!DOCTYPE html>' +
    renderToStaticMarkup(
      <AmpStateContext.Provider value={ampState}>
        {Document.renderDocument(Document, {
          __NEXT_DATA__: {
            props, // The result of getInitialProps
            page: pathname, // The rendered page
            query, // querystring parsed / passed by the user
            buildId, // buildId is used to facilitate caching of page bundles, we send it to the client so that pageloader knows where to load bundles
            assetPrefix: assetPrefix === '' ? undefined : assetPrefix, // send assetPrefix to the client side when configured, otherwise don't sent in the resulting HTML
            runtimeConfig, // runtimeConfig if provided, otherwise don't sent in the resulting HTML
            nextExport, // If this is a page exported by `next export`
            autoExport, // If this is an auto exported page
            isFallback,
            dynamicIds:
              dynamicImportsIds.length === 0 ? undefined : dynamicImportsIds,
            err: err ? serializeError(dev, err) : undefined, // Error if one happened, otherwise don't sent in the resulting HTML
            gsp, // whether the page is getStaticProps
            gssp, // whether the page is getServerSideProps
            customServer, // whether the user is using a custom server
            gip, // whether the page has getInitialProps
            appGip, // whether the _app has getInitialProps
          },
          buildManifest,
          dangerousAsPath,
          canonicalBase,
          ampPath,
          inAmpMode,
          isDevelopment: !!dev,
          hybridAmp,
          files,
          dynamicImports,
          assetPrefix,
          headTags,
          unstable_runtimeJS,
          ...docProps,
        })}
      </AmpStateContext.Provider>
    )
  )
}

const invalidKeysMsg = (methodName: string, invalidKeys: string[]) => {
  return (
    `Additional keys were returned from \`${methodName}\`. Properties intended for your component must be nested under the \`props\` key, e.g.:` +
    `\n\n\treturn { props: { title: 'My Title', content: '...' } }` +
    `\n\nKeys that need to be moved: ${invalidKeys.join(', ')}.` +
    `\nRead more: https://err.sh/next.js/invalid-getstaticprops-value`
  )
}

export async function renderToHTML(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  query: ParsedUrlQuery,
  renderOpts: RenderOpts
): Promise<string | null> {
  const {
    err,
    dev = false,
    ampPath = '',
    App,
    Document,
    pageConfig = {},
    Component,
    buildManifest,
    reactLoadableManifest,
    ErrorDebug,
    getStaticProps,
    getStaticPaths,
    getServerSideProps,
    isDataReq,
    params,
    previewProps,
    basePath,
  } = renderOpts

  const callMiddleware = async (method: string, args: any[], props = false) => {
    let results: any = props ? {} : []

    if ((Document as any)[`${method}Middleware`]) {
      let middlewareFunc = await (Document as any)[`${method}Middleware`]
      middlewareFunc = middlewareFunc.default || middlewareFunc

      const curResults = await middlewareFunc(...args)
      if (props) {
        for (const result of curResults) {
          results = {
            ...results,
            ...result,
          }
        }
      } else {
        results = curResults
      }
    }
    return results
  }

  const headTags = (...args: any) => callMiddleware('headTags', args)

  const didRewrite =
    (req as any)._nextDidRewrite && (req as any)._nextRewroteUrl !== req.url
  const isFallback = !!query.__nextFallback
  delete query.__nextFallback

  const isSSG = !!getStaticProps
  const isBuildTimeSSG = isSSG && renderOpts.nextExport
  const defaultAppGetInitialProps =
    App.getInitialProps === (App as any).origGetInitialProps

  const hasPageGetInitialProps = !!(Component as any).getInitialProps

  const pageIsDynamic = isDynamicRoute(pathname)

  const isAutoExport =
    !hasPageGetInitialProps &&
    defaultAppGetInitialProps &&
    !isSSG &&
    !getServerSideProps

  for (const methodName of [
    'getStaticProps',
    'getServerSideProps',
    'getStaticPaths',
  ]) {
    if ((Component as any)[methodName]) {
      throw new Error(
        `page ${pathname} ${methodName} ${GSSP_COMPONENT_MEMBER_ERROR}`
      )
    }
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    (isAutoExport || isFallback) &&
    pageIsDynamic &&
    didRewrite
  ) {
    // TODO: If we decide to ship rewrites to the client we could
    // solve this by running over the rewrites and getting the params.
    throw new Error(
      `Rewrites don't support${
        isFallback ? ' ' : ' auto-exported '
      }dynamic pages${isFallback ? ' with getStaticProps ' : ' '}yet.\n` +
        `Using this will cause the page to fail to parse the params on the client\n` +
        `See more info: https://err.sh/next.js/rewrite-auto-export-fallback`
    )
  }

  if (hasPageGetInitialProps && isSSG) {
    throw new Error(SSG_GET_INITIAL_PROPS_CONFLICT + ` ${pathname}`)
  }

  if (hasPageGetInitialProps && getServerSideProps) {
    throw new Error(SERVER_PROPS_GET_INIT_PROPS_CONFLICT + ` ${pathname}`)
  }

  if (getServerSideProps && isSSG) {
    throw new Error(SERVER_PROPS_SSG_CONFLICT + ` ${pathname}`)
  }

  if (!!getStaticPaths && !isSSG) {
    throw new Error(
      `getStaticPaths was added without a getStaticProps in ${pathname}. Without getStaticProps, getStaticPaths does nothing`
    )
  }

  if (isSSG && pageIsDynamic && !getStaticPaths) {
    throw new Error(
      `getStaticPaths is required for dynamic SSG pages and is missing for '${pathname}'.` +
        `\nRead more: https://err.sh/next.js/invalid-getstaticpaths-value`
    )
  }

  if (dev) {
    const { isValidElementType } = require('react-is')
    if (!isValidElementType(Component)) {
      throw new Error(
        `The default export is not a React Component in page: "${pathname}"`
      )
    }

    if (!isValidElementType(App)) {
      throw new Error(
        `The default export is not a React Component in page: "/_app"`
      )
    }

    if (!isValidElementType(Document)) {
      throw new Error(
        `The default export is not a React Component in page: "/_document"`
      )
    }

    if (isAutoExport) {
      // remove query values except ones that will be set during export
      query = {
        ...(query.amp
          ? {
              amp: query.amp,
            }
          : {}),
      }
      req.url = pathname
      renderOpts.nextExport = true
    }

    if (pathname === '/404' && (hasPageGetInitialProps || getServerSideProps)) {
      throw new Error(PAGES_404_GET_INITIAL_PROPS_ERROR)
    }
  }
  if (isAutoExport) renderOpts.autoExport = true
  if (isSSG) renderOpts.nextExport = false

  await Loadable.preloadAll() // Make sure all dynamic imports are loaded

  // url will always be set
  const asPath: string = req.url as string
  const router = new ServerRouter(
    pathname,
    query,
    asPath,
    {
      isFallback: isFallback,
    },
    basePath
  )
  const ctx = {
    err,
    req: isAutoExport ? undefined : req,
    res: isAutoExport ? undefined : res,
    pathname,
    query,
    asPath,
    AppTree: (props: any) => {
      return (
        <AppContainer>
          <App {...props} Component={Component} router={router} />
        </AppContainer>
      )
    },
  }
  let props: any

  const ampState = {
    ampFirst: pageConfig.amp === true,
    hasQuery: Boolean(query.amp),
    hybrid: pageConfig.amp === 'hybrid',
  }

  const inAmpMode = isInAmpMode(ampState)

  const reactLoadableModules: string[] = []

  let head: JSX.Element[] = defaultHead(inAmpMode)

  const AppContainer = ({ children }: any) => (
    <RouterContext.Provider value={router}>
      <AmpStateContext.Provider value={ampState}>
        <HeadManagerContext.Provider
          value={{
            updateHead: (state) => {
              head = state
            },
            mountedInstances: new Set(),
          }}
        >
          <LoadableContext.Provider
            value={(moduleName) => reactLoadableModules.push(moduleName)}
          >
            {children}
          </LoadableContext.Provider>
        </HeadManagerContext.Provider>
      </AmpStateContext.Provider>
    </RouterContext.Provider>
  )

  try {
    props = await loadGetInitialProps(App, {
      AppTree: ctx.AppTree,
      Component,
      router,
      ctx,
    })

    if (isSSG) {
      props[STATIC_PROPS_ID] = true
    }

    let previewData: string | false | object | undefined

    if ((isSSG || getServerSideProps) && !isFallback) {
      // Reads of this are cached on the `req` object, so this should resolve
      // instantly. There's no need to pass this data down from a previous
      // invoke, where we'd have to consider server & serverless.
      previewData = tryGetPreviewData(req, res, previewProps)
    }

    if (isSSG && !isFallback) {
      let data: UnwrapPromise<ReturnType<GetStaticProps>>

      try {
        data = await getStaticProps!({
          ...(pageIsDynamic ? { params: query as ParsedUrlQuery } : undefined),
          ...(previewData !== false
            ? { preview: true, previewData: previewData }
            : undefined),
        })
      } catch (staticPropsError) {
        // remove not found error code to prevent triggering legacy
        // 404 rendering
        if (staticPropsError.code === 'ENOENT') {
          delete staticPropsError.code
        }
        throw staticPropsError
      }

      if (data == null) {
        throw new Error(GSP_NO_RETURNED_VALUE)
      }

      const invalidKeys = Object.keys(data).filter(
        (key) => key !== 'unstable_revalidate' && key !== 'props'
      )

      if (invalidKeys.includes('revalidate')) {
        throw new Error(UNSTABLE_REVALIDATE_RENAME_ERROR)
      }

      if (invalidKeys.length) {
        throw new Error(invalidKeysMsg('getStaticProps', invalidKeys))
      }

      if (
        (dev || isBuildTimeSSG) &&
        !isSerializableProps(pathname, 'getStaticProps', data.props)
      ) {
        // this fn should throw an error instead of ever returning `false`
        throw new Error(
          'invariant: getStaticProps did not return valid props. Please report this.'
        )
      }

      if (typeof data.unstable_revalidate === 'number') {
        if (!Number.isInteger(data.unstable_revalidate)) {
          throw new Error(
            `A page's revalidate option must be seconds expressed as a natural number. Mixed numbers, such as '${data.unstable_revalidate}', cannot be used.` +
              `\nTry changing the value to '${Math.ceil(
                data.unstable_revalidate
              )}' or using \`Math.ceil()\` if you're computing the value.`
          )
        } else if (data.unstable_revalidate <= 0) {
          throw new Error(
            `A page's revalidate option can not be less than or equal to zero. A revalidate option of zero means to revalidate after _every_ request, and implies stale data cannot be tolerated.` +
              `\n\nTo never revalidate, you can set revalidate to \`false\` (only ran once at build-time).` +
              `\nTo revalidate as soon as possible, you can set the value to \`1\`.`
          )
        } else if (data.unstable_revalidate > 31536000) {
          // if it's greater than a year for some reason error
          console.warn(
            `Warning: A page's revalidate option was set to more than a year. This may have been done in error.` +
              `\nTo only run getStaticProps at build-time and not revalidate at runtime, you can set \`revalidate\` to \`false\`!`
          )
        }
      } else if (data.unstable_revalidate === true) {
        // When enabled, revalidate after 1 second. This value is optimal for
        // the most up-to-date page possible, but without a 1-to-1
        // request-refresh ratio.
        data.unstable_revalidate = 1
      } else {
        // By default, we never revalidate.
        data.unstable_revalidate = false
      }

      props.pageProps = Object.assign({}, props.pageProps, data.props)
      // pass up revalidate and props for export
      // TODO: change this to a different passing mechanism
      ;(renderOpts as any).revalidate = data.unstable_revalidate
      ;(renderOpts as any).pageData = props
    }

    if (getServerSideProps) {
      props[SERVER_PROPS_ID] = true
    }

    if (getServerSideProps && !isFallback) {
      let data: UnwrapPromise<ReturnType<GetServerSideProps>>

      try {
        data = await getServerSideProps({
          req,
          res,
          query,
          ...(pageIsDynamic ? { params: params as ParsedUrlQuery } : undefined),
          ...(previewData !== false
            ? { preview: true, previewData: previewData }
            : undefined),
        })
      } catch (serverSidePropsError) {
        // remove not found error code to prevent triggering legacy
        // 404 rendering
        if (serverSidePropsError.code === 'ENOENT') {
          delete serverSidePropsError.code
        }
        throw serverSidePropsError
      }

      if (data == null) {
        throw new Error(GSSP_NO_RETURNED_VALUE)
      }

      const invalidKeys = Object.keys(data).filter((key) => key !== 'props')

      if (invalidKeys.length) {
        throw new Error(invalidKeysMsg('getServerSideProps', invalidKeys))
      }

      if (
        (dev || isBuildTimeSSG) &&
        !isSerializableProps(pathname, 'getServerSideProps', data.props)
      ) {
        // this fn should throw an error instead of ever returning `false`
        throw new Error(
          'invariant: getServerSideProps did not return valid props. Please report this.'
        )
      }

      props.pageProps = Object.assign({}, props.pageProps, data.props)
      ;(renderOpts as any).pageData = props
    }
  } catch (dataFetchError) {
    if (isDataReq || !dev || !dataFetchError) throw dataFetchError
    ctx.err = dataFetchError
    renderOpts.err = dataFetchError
    console.error(dataFetchError)
  }

  if (
    !isSSG && // we only show this warning for legacy pages
    !getServerSideProps &&
    process.env.NODE_ENV !== 'production' &&
    Object.keys(props?.pageProps || {}).includes('url')
  ) {
    console.warn(
      `The prop \`url\` is a reserved prop in Next.js for legacy reasons and will be overridden on page ${pathname}\n` +
        `See more info here: https://err.sh/vercel/next.js/reserved-page-prop`
    )
  }

  // We only need to do this if we want to support calling
  // _app's getInitialProps for getServerSideProps if not this can be removed
  if (isDataReq && !isSSG) return props

  // We don't call getStaticProps or getServerSideProps while generating
  // the fallback so make sure to set pageProps to an empty object
  if (isFallback) {
    props.pageProps = {}
  }

  // the response might be finished on the getInitialProps call
  if (isResSent(res) && !isSSG) return null

  // AMP First pages do not have client-side JavaScript files
  const files = ampState.ampFirst
    ? []
    : [
        ...new Set([
          ...getPageFiles(buildManifest, '/_app'),
          ...(pathname !== '/_error'
            ? getPageFiles(buildManifest, pathname)
            : []),
        ]),
      ]

  const renderPage: RenderPage = (
    options: ComponentsEnhancer = {}
  ): { html: string; head: any } => {
    if (ctx.err && ErrorDebug) {
      return { html: renderToString(<ErrorDebug error={ctx.err} />), head }
    }

    if (dev && (props.router || props.Component)) {
      throw new Error(
        `'router' and 'Component' can not be returned in getInitialProps from _app.js https://err.sh/vercel/next.js/cant-override-next-props`
      )
    }

    const {
      App: EnhancedApp,
      Component: EnhancedComponent,
    } = enhanceComponents(options, App, Component)

    const html = renderToString(
      <AppContainer>
        <EnhancedApp Component={EnhancedComponent} router={router} {...props} />
      </AppContainer>
    )

    return { html, head }
  }
  const documentCtx = { ...ctx, renderPage }
  const docProps: DocumentInitialProps = await loadGetInitialProps(
    Document,
    documentCtx
  )
  // the response might be finished on the getInitialProps call
  if (isResSent(res) && !isSSG) return null

  if (!docProps || typeof docProps.html !== 'string') {
    const message = `"${getDisplayName(
      Document
    )}.getInitialProps()" should resolve to an object with a "html" prop set with a valid html string`
    throw new Error(message)
  }

  const dynamicImportIdsSet = new Set<string>()
  const dynamicImports: ManifestItem[] = []

  for (const mod of reactLoadableModules) {
    const manifestItem: ManifestItem[] = reactLoadableManifest[mod]

    if (manifestItem) {
      manifestItem.forEach((item) => {
        dynamicImports.push(item)
        dynamicImportIdsSet.add(item.id as string)
      })
    }
  }

  const dynamicImportsIds = [...dynamicImportIdsSet]
  const hybridAmp = ampState.hybrid

  // update renderOpts so export knows current state
  renderOpts.inAmpMode = inAmpMode
  renderOpts.hybridAmp = hybridAmp

  let html = renderDocument(Document, {
    ...renderOpts,
    // Only enabled in production as development mode has features relying on HMR (style injection for example)
    unstable_runtimeJS:
      process.env.NODE_ENV === 'production'
        ? pageConfig.unstable_runtimeJS
        : undefined,
    dangerousAsPath: router.asPath,
    ampState,
    props,
    headTags: await headTags(documentCtx),
    isFallback,
    docProps,
    pathname,
    ampPath,
    query,
    inAmpMode,
    hybridAmp,
    dynamicImportsIds,
    dynamicImports,
    files,
    gsp: !!getStaticProps ? true : undefined,
    gssp: !!getServerSideProps ? true : undefined,
    gip: hasPageGetInitialProps ? true : undefined,
    appGip: !defaultAppGetInitialProps ? true : undefined,
  })

  if (inAmpMode && html) {
    // inject HTML to AMP_RENDER_TARGET to allow rendering
    // directly to body in AMP mode
    const ampRenderIndex = html.indexOf(AMP_RENDER_TARGET)
    html =
      html.substring(0, ampRenderIndex) +
      `<!-- __NEXT_DATA__ -->${docProps.html}` +
      html.substring(ampRenderIndex + AMP_RENDER_TARGET.length)
    html = await optimizeAmp(html, renderOpts.ampOptimizerConfig)

    if (!renderOpts.ampSkipValidation && renderOpts.ampValidator) {
      await renderOpts.ampValidator(html, pathname)
    }
  }

  if (inAmpMode || hybridAmp) {
    // fix &amp being escaped for amphtml rel link
    html = html.replace(/&amp;amp=1/g, '&amp=1')
  }

  return html
}

function errorToJSON(err: Error): Error {
  const { name, message, stack } = err
  return { name, message, stack }
}

function serializeError(
  dev: boolean | undefined,
  err: Error
): Error & { statusCode?: number } {
  if (dev) {
    return errorToJSON(err)
  }

  return {
    name: 'Internal Server Error.',
    message: '500 - Internal Server Error.',
    statusCode: 500,
  }
}
