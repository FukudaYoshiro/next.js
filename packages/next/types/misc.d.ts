declare module 'next/dist/compiled/babel--plugin-transform-modules-commonjs'
declare module 'webpack/lib/GraphHelpers'
declare module 'webpack/lib/DynamicEntryPlugin'
declare module 'unfetch'
declare module 'launch-editor'
declare module 'styled-jsx/server'

declare module 'cssnano-simple' {
  import { Plugin } from 'postcss'
  const cssnanoSimple: Plugin<{}>
  export = cssnanoSimple
}
declare module 'next/dist/compiled/amphtml-validator' {
  import m from 'amphtml-validator'
  export = m
}
declare module 'next/dist/compiled/async-retry'
declare module 'next/dist/compiled/async-sema' {
  import m from 'async-sema'
  export = m
}
declare module 'next/dist/compiled/arg/index.js' {
  function arg<T extends arg.Spec>(
    spec: T,
    options?: { argv?: string[]; permissive?: boolean }
  ): arg.Result<T>

  namespace arg {
    export type Handler = (value: string) => any

    export interface Spec {
      [key: string]: string | Handler | [Handler]
    }

    export type Result<T extends Spec> = { _: string[] } & {
      [K in keyof T]: T[K] extends string
        ? never
        : T[K] extends Handler
        ? ReturnType<T[K]>
        : T[K] extends [Handler]
        ? Array<ReturnType<T[K][0]>>
        : never
    }
  }

  export = arg
}

declare module 'next/dist/compiled/babel--core' {
  import m from '@babel/core'
  export = m
}
declare module 'next/dist/compiled/babel--types' {
  import m from '@babel/types'
  export = m
}
declare module 'next/dist/compiled/browserslist'
declare module 'next/dist/compiled/chalk' {
  import m from 'chalk'
  export = m
}
declare module 'next/dist/compiled/ci-info' {
  import m from 'ci-info'
  export = m
}
declare module 'next/dist/compiled/compression' {
  import m from 'compression'
  export = m
}
declare module 'next/dist/compiled/content-type' {
  import m from 'content-type'
  export = m
}
declare module 'next/dist/compiled/cookie' {
  import m from 'cookie'
  export = m
}
declare module 'next/dist/compiled/devalue' {
  import m from 'devalue'
  export = m
}
declare module 'next/dist/compiled/dotenv' {
  import m from 'dotenv'
  export = m
}

declare module 'next/dist/compiled/dotenv-expand' {
  import m from 'dotenv-expand'
  export = m
}
declare module 'next/dist/compiled/escape-string-regexp' {
  import m from 'escape-string-regexp'
  export = m
}
declare module 'next/dist/compiled/etag' {
  import m from 'etag'
  export = m
}
declare module 'next/dist/compiled/fresh' {
  import m from 'fresh'
  export = m
}
declare module 'next/dist/compiled/gzip-size' {
  import m from 'gzip-size'
  export = m
}
declare module 'next/dist/compiled/http-proxy' {
  import m from 'http-proxy'
  export = m
}
declare module 'next/dist/compiled/is-docker' {
  import m from 'is-docker'
  export = m
}
declare module 'next/dist/compiled/is-wsl' {
  import m from 'is-wsl'
  export = m
}
declare module 'next/dist/compiled/json5' {
  import m from 'json5'
  export = m
}
declare module 'next/dist/compiled/jsonwebtoken' {
  import m from 'jsonwebtoken'
  export = m
}
declare module 'next/dist/compiled/launch-editor' {
  import m from 'launch-editor'
  export = m
}
declare module 'next/dist/compiled/lodash.curry' {
  import m from 'lodash.curry'
  export = m
}
declare module 'next/dist/compiled/lru-cache' {
  import m from 'lru-cache'
  export = m
}
declare module 'next/dist/compiled/nanoid/index.js' {
  function nanoid(size?: number): string
  export = nanoid
}
declare module 'next/dist/compiled/node-fetch' {
  import m from 'node-fetch'
  export = m
}
declare module 'next/dist/compiled/ora' {
  import m from 'ora'
  export = m
}
declare module 'next/dist/compiled/raw-body' {
  import m from 'raw-body'
  export = m
}
declare module 'next/dist/compiled/recast' {
  import m from 'recast'
  export = m
}
declare module 'next/dist/compiled/resolve/index.js' {
  import m from 'resolve'
  export = m
}
declare module 'next/dist/compiled/send' {
  import m from 'send'
  export = m
}
declare module 'next/dist/compiled/source-map' {
  import m from 'source-map'
  export = m
}
declare module 'next/dist/compiled/string-hash' {
  import m from 'string-hash'
  export = m
}
declare module 'next/dist/compiled/strip-ansi' {
  import m from 'strip-ansi'
  export = m
}
declare module 'next/dist/compiled/text-table' {
  function textTable(
    rows: Array<Array<{}>>,
    opts?: {
      hsep?: string
      align?: Array<'l' | 'r' | 'c' | '.'>
      stringLength?(str: string): number
    }
  ): string

  export = textTable
}

declare module 'next/dist/compiled/unistore' {
  import m from 'unistore'
  export = m
}

declare module 'autodll-webpack-plugin' {
  import webpack from 'webpack'
  class AutoDllPlugin implements webpack.Plugin {
    constructor(settings?: {
      inject?: boolean
      plugins?: webpack.Configuration['plugins']
      context?: string
      debug?: boolean
      filename?: string
      path?: string
      inherit?: boolean
      entry?: webpack.Entry
      config?: webpack.Configuration
    })
    apply: webpack.Plugin['apply'];
    [k: string]: any
  }

  export = AutoDllPlugin
}

declare module 'pnp-webpack-plugin' {
  import webpack from 'webpack'
  import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'

  class PnpWebpackPlugin extends webpack.Plugin {
    static forkTsCheckerOptions: <
      T extends Partial<ForkTsCheckerWebpackPlugin.Options>
    >(
      settings: T
    ) => T & {
      resolveModuleNameModule?: string
      resolveTypeReferenceDirectiveModule?: string
    }
  }

  export = PnpWebpackPlugin
}

declare module NodeJS {
  interface ProcessVersions {
    pnp?: string
  }
  interface Process {
    crossOrigin?: string
  }
}

declare module 'watchpack' {
  import { EventEmitter } from 'events'

  class Watchpack extends EventEmitter {
    watch(files: string[], directories: string[], startTime?: number): void
    close(): void

    getTimeInfoEntries(): Map<
      string,
      { safeTime: number; timestamp: number; accuracy?: number }
    >
  }

  export default Watchpack
}
