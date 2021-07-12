import os from 'os'
import { Header, Redirect, Rewrite } from '../lib/load-custom-routes'
import { ImageConfig, imageConfigDefault } from './image-config'

export type DomainLocales = Array<{
  http?: true
  domain: string
  locales?: string[]
  defaultLocale: string
}>

type NoOptionals<T> = {
  [P in keyof T]-?: T[P]
}

export type NextConfigComplete = NoOptionals<NextConfig>

export type NextConfig = { [key: string]: any } & {
  i18n?: {
    locales: string[]
    defaultLocale: string
    domains?: DomainLocales
    localeDetection?: false
  } | null

  headers?: () => Promise<Header[]>
  rewrites?: () => Promise<
    | Rewrite[]
    | {
        beforeFiles: Rewrite[]
        afterFiles: Rewrite[]
        fallback: Rewrite[]
      }
  >
  redirects?: () => Promise<Redirect[]>

  webpack5?: false
  excludeDefaultMomentLocales?: boolean

  trailingSlash?: boolean
  env?: { [key: string]: string }
  distDir?: string
  cleanDistDir?: boolean
  assetPrefix?: string
  useFileSystemPublicRoutes?: boolean
  generateBuildId: () => string | null
  generateEtags?: boolean
  pageExtensions?: string[]
  compress?: boolean
  images?: ImageConfig
  devIndicators?: {
    buildActivity?: boolean
  }
  onDemandEntries?: {
    maxInactiveAge?: number
    pagesBufferLength?: number
  }
  amp?: {
    canonicalBase?: string
  }
  basePath?: string
  sassOptions?: { [key: string]: any }
  productionBrowserSourceMaps?: boolean
  optimizeFonts?: boolean

  future: {
    /**
     * @deprecated this options was moved to the top level
     */
    webpack5?: false
    strictPostcssConfiguration?: boolean
  }
  experimental: {
    cpus?: number
    plugins?: boolean
    profiling?: boolean
    sprFlushToDisk?: boolean
    reactMode?: 'legacy' | 'concurrent' | 'blocking'
    workerThreads?: boolean
    pageEnv?: boolean
    optimizeImages?: boolean
    optimizeCss?: boolean
    scrollRestoration?: boolean
    stats?: boolean
    externalDir?: boolean
    conformance?: boolean
    amp?: {
      optimizer?: any
      validator?: string
      skipValidation?: boolean
    }
    reactRoot?: boolean
    disableOptimizedLoading?: boolean
    gzipSize?: boolean
    craCompat?: boolean
    esmExternals?: boolean | 'loose'
  }
}

export const defaultConfig: NextConfig = {
  env: {},
  webpack: null,
  webpackDevMiddleware: null,
  distDir: '.next',
  cleanDistDir: true,
  assetPrefix: '',
  configOrigin: 'default',
  useFileSystemPublicRoutes: true,
  generateBuildId: () => null,
  generateEtags: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  target: 'server',
  poweredByHeader: true,
  compress: true,
  analyticsId: process.env.VERCEL_ANALYTICS_ID || '',
  images: imageConfigDefault,
  devIndicators: {
    buildActivity: true,
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
  amp: {
    canonicalBase: '',
  },
  basePath: '',
  sassOptions: {},
  trailingSlash: false,
  i18n: null,
  productionBrowserSourceMaps: false,
  optimizeFonts: true,
  webpack5:
    Number(process.env.NEXT_PRIVATE_TEST_WEBPACK4_MODE) > 0 ? false : undefined,
  excludeDefaultMomentLocales: true,
  serverRuntimeConfig: {},
  publicRuntimeConfig: {},
  reactStrictMode: false,
  experimental: {
    cpus: Math.max(
      1,
      (Number(process.env.CIRCLE_NODE_TOTAL) ||
        (os.cpus() || { length: 1 }).length) - 1
    ),
    plugins: false,
    profiling: false,
    sprFlushToDisk: true,
    workerThreads: false,
    pageEnv: false,
    optimizeImages: false,
    optimizeCss: false,
    scrollRestoration: false,
    stats: false,
    externalDir: false,
    reactRoot: Number(process.env.NEXT_PRIVATE_REACT_ROOT) > 0,
    disableOptimizedLoading: false,
    gzipSize: true,
    craCompat: false,
    esmExternals: false,
  },
  future: {
    strictPostcssConfiguration: false,
  },
}

export function normalizeConfig(phase: string, config: any) {
  if (typeof config === 'function') {
    config = config(phase, { defaultConfig })

    if (typeof config.then === 'function') {
      throw new Error(
        '> Promise returned in next config. https://nextjs.org/docs/messages/promise-in-next-config'
      )
    }
  }
  return config
}
