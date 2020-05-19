const notifier = require('node-notifier')
const relative = require('path').relative

export async function next__polyfill_nomodule(task, opts) {
  await task
    .source(
      opts.src ||
        relative(__dirname, require.resolve('@next/polyfill-nomodule'))
    )
    .target('dist/build/polyfills')
}

export async function finally_polyfill(task, opts) {
  await task
    .source(
      opts.src || relative(__dirname, require.resolve('finally-polyfill'))
    )
    .target('dist/build/polyfills')
}

export async function unfetch(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('unfetch')))
    .target('dist/build/polyfills')
}

export async function browser_polyfills(task) {
  await task.parallel([
    'next__polyfill_nomodule',
    'finally_polyfill',
    'unfetch',
  ])
}

const externals = {
  // Babel
  '@babel/core': '@babel/core',

  // Browserslist (post-css plugins)
  browserslist: 'browserslist',

  // Webpack indirect and direct dependencies:
  webpack: 'webpack',
  'webpack-sources': 'webpack-sources',
  // dependents: webpack-dev-middleware
  'webpack/lib/node/NodeOutputFileSystem':
    'webpack/lib/node/NodeOutputFileSystem',
  // dependents: terser-webpack-plugin
  'webpack/lib/cache/getLazyHashedEtag': 'webpack/lib/cache/getLazyHashedEtag',
  'webpack/lib/RequestShortener': 'webpack/lib/RequestShortener',
  chokidar: 'chokidar',
  // dependents: babel-loader, async-retry, autodll-webpack-plugin, cache-loader, terser-webpack-plugin
  'find-cache-dir': 'find-cache-dir',
  // dependents: thread-loader
  'loader-runner': 'loader-runner',
  // dependents: thread-loader, babel-loader
  'loader-utils': 'loader-utils',
  // dependents: babel-loader
  mkdirp: 'mkdirp',
  // dependents: thread-loader, cache-loader
  'neo-async': 'neo-async',
  // dependents: cache-loader, style-loader, file-loader
  'schema-utils': 'schema-utils',
  // dependents: terser-webpack-plugin
  'jest-worker': 'jest-worker',
  cacache: 'cacache',
}

// eslint-disable-next-line camelcase
externals['amphtml-validator'] = 'next/dist/compiled/amphtml-validator'
export async function ncc_amphtml_validator(task, opts) {
  await task
    .source(
      opts.src || relative(__dirname, require.resolve('amphtml-validator'))
    )
    .ncc({ packageName: 'amphtml-validator', externals })
    .target('compiled/amphtml-validator')
}
// eslint-disable-next-line camelcase
externals['arg'] = 'distcompiled/arg'
export async function ncc_arg(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('arg')))
    .ncc({ packageName: 'arg' })
    .target('compiled/arg')
}
// eslint-disable-next-line camelcase
externals['async-retry'] = 'next/dist/compiled/async-retry'
export async function ncc_async_retry(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('async-retry')))
    .ncc({
      packageName: 'async-retry',
      externals,
    })
    .target('compiled/async-retry')
}
// eslint-disable-next-line camelcase
externals['async-sema'] = 'next/dist/compiled/async-sema'
export async function ncc_async_sema(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('async-sema')))
    .ncc({ packageName: 'async-sema', externals })
    .target('compiled/async-sema')
}
// eslint-disable-next-line camelcase
externals['autodll-webpack-plugin'] =
  'next/dist/compiled/autodll-webpack-plugin'
export async function ncc_autodll_webpack_plugin(task, opts) {
  await task
    .source(opts.src || 'build/bundles/autodll-webpack-plugin.js')
    .ncc({ packageName: 'autodll-webpack-plugin', externals })
    .target('compiled/autodll-webpack-plugin')
}
// eslint-disable-next-line camelcase
externals['babel-loader'] = 'next/dist/compiled/babel-loader'
export async function ncc_babel_loader(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('babel-loader')))
    .ncc({ packageName: 'babel-loader', externals })
    .target('compiled/babel-loader')
}
// eslint-disable-next-line camelcase
externals['cache-loader'] = 'next/dist/compiled/cache-loader'
export async function ncc_cache_loader(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('cache-loader')))
    .ncc({ packageName: 'cache-loader', externals })
    .target('compiled/cache-loader')
}
// eslint-disable-next-line camelcase
// NB: Used by other dependencies, but Vercel version is a duplicate
// version so can be inlined anyway (although may change in future)
externals['chalk'] = 'next/dist/compiled/chalk'
export async function ncc_chalk(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('chalk')))
    .ncc({ packageName: 'chalk', externals })
    .target('compiled/chalk')
}
// eslint-disable-next-line camelcase
externals['ci-info'] = 'next/dist/compiled/ci-info'
export async function ncc_ci_info(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('ci-info')))
    .ncc({ packageName: 'ci-info', externals })
    .target('compiled/ci-info')
}
// eslint-disable-next-line camelcase
externals['compression'] = 'next/dist/compiled/compression'
export async function ncc_compression(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('compression')))
    .ncc({ packageName: 'compression', externals })
    .target('compiled/compression')
}
// eslint-disable-next-line camelcase
externals['conf'] = 'next/dist/compiled/conf'
export async function ncc_conf(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('conf')))
    .ncc({ packageName: 'conf', externals })
    .target('compiled/conf')
}
// eslint-disable-next-line camelcase
externals['content-type'] = 'next/dist/compiled/content-type'
export async function ncc_content_type(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('content-type')))
    .ncc({ packageName: 'content-type', externals })
    .target('compiled/content-type')
}
// eslint-disable-next-line camelcase
externals['cookie'] = 'next/dist/compiled/cookie'
export async function ncc_cookie(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('cookie')))
    .ncc({ packageName: 'cookie', externals })
    .target('compiled/cookie')
}
// eslint-disable-next-line camelcase
externals['cssnano-simple'] = 'next/dist/compiled/cssnano-simple'
export async function ncc_cssnano_simple(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('cssnano-simple')))
    .ncc({ packageName: 'cssnano-simple', externals })
    .target('compiled/cssnano-simple')
}
// eslint-disable-next-line camelcase
externals['debug'] = 'next/dist/compiled/debug'
export async function ncc_debug(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('debug')))
    .ncc({ packageName: 'debug', externals })
    .target('compiled/debug')
}
// eslint-disable-next-line camelcase
externals['devalue'] = 'next/dist/compiled/devalue'
export async function ncc_devalue(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('devalue')))
    .ncc({ packageName: 'devalue', externals })
    .target('compiled/devalue')
}
// eslint-disable-next-line camelcase
externals['dotenv'] = 'next/dist/compiled/dotenv'
export async function ncc_dotenv(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('dotenv')))
    .ncc({ packageName: 'dotenv', externals })
    .target('compiled/dotenv')
}
// eslint-disable-next-line camelcase
externals['dotenv-expand'] = 'next/dist/compiled/dotenv-expand'
export async function ncc_dotenv_expand(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('dotenv-expand')))
    .ncc({ packageName: 'dotenv-expand', externals })
    .target('compiled/dotenv-expand')
}
externals['escape-string-regexp'] = 'next/dist/compiled/escape-string-regexp'
// eslint-disable-next-line camelcase
export async function ncc_escape_string_regexp(task, opts) {
  await task
    .source(
      opts.src || relative(__dirname, require.resolve('escape-string-regexp'))
    )
    .ncc({ packageName: 'escape-string-regexp', externals })
    .target('compiled/escape-string-regexp')
}
// eslint-disable-next-line camelcase
externals['etag'] = 'next/dist/compiled/etag'
export async function ncc_etag(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('etag')))
    .ncc({ packageName: 'etag', externals })
    .target('compiled/etag')
}
// eslint-disable-next-line camelcase
externals['file-loader'] = 'next/dist/compiled/file-loader'
export async function ncc_file_loader(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('file-loader')))
    .ncc({ packageName: 'file-loader', externals })
    .target('compiled/file-loader')
}
// eslint-disable-next-line camelcase
externals['find-up'] = 'next/dist/compiled/find-up'
export async function ncc_find_up(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('find-up')))
    .ncc({ packageName: 'find-up', externals })
    .target('compiled/find-up')
}
// eslint-disable-next-line camelcase
externals['fresh'] = 'next/dist/compiled/fresh'
export async function ncc_fresh(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('fresh')))
    .ncc({ packageName: 'fresh', externals })
    .target('compiled/fresh')
}
// eslint-disable-next-line camelcase
externals['gzip-size'] = 'next/dist/compiled/gzip-size'
export async function ncc_gzip_size(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('gzip-size')))
    .ncc({ packageName: 'gzip-size', externals })
    .target('compiled/gzip-size')
}
// eslint-disable-next-line camelcase
externals['http-proxy'] = 'next/dist/compiled/http-proxy'
export async function ncc_http_proxy(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('http-proxy')))
    .ncc({ packageName: 'http-proxy', externals })
    .target('compiled/http-proxy')
}
// eslint-disable-next-line camelcase
externals['ignore-loader'] = 'next/dist/compiled/ignore-loader'
export async function ncc_ignore_loader(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('ignore-loader')))
    .ncc({ packageName: 'ignore-loader', externals })
    .target('compiled/ignore-loader')
}
// eslint-disable-next-line camelcase
externals['is-docker'] = 'next/dist/compiled/is-docker'
export async function ncc_is_docker(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('is-docker')))
    .ncc({ packageName: 'is-docker', externals })
    .target('compiled/is-docker')
}
// eslint-disable-next-line camelcase
externals['is-wsl'] = 'next/dist/compiled/is-wsl'
export async function ncc_is_wsl(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('is-wsl')))
    .ncc({ packageName: 'is-wsl', externals })
    .target('compiled/is-wsl')
}
// eslint-disable-next-line camelcase
externals['json5'] = 'next/dist/compiled/json5'
export async function ncc_json5(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('json5')))
    .ncc({ packageName: 'json5', externals })
    .target('compiled/json5')
}
// eslint-disable-next-line camelcase
externals['jsonwebtoken'] = 'next/dist/compiled/jsonwebtoken'
export async function ncc_jsonwebtoken(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('jsonwebtoken')))
    .ncc({ packageName: 'jsonwebtoken', externals })
    .target('compiled/jsonwebtoken')
}
// eslint-disable-next-line camelcase
externals['launch-editor'] = 'next/dist/compiled/launch-editor'
export async function ncc_launch_editor(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('launch-editor')))
    .ncc({ packageName: 'launch-editor', externals })
    .target('compiled/launch-editor')
}
// eslint-disable-next-line camelcase
externals['lodash.curry'] = 'next/dist/compiled/lodash.curry'
export async function ncc_lodash_curry(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('lodash.curry')))
    .ncc({ packageName: 'lodash.curry', externals })
    .target('compiled/lodash.curry')
}
// eslint-disable-next-line camelcase
externals['lru-cache'] = 'next/dist/compiled/lru-cache'
export async function ncc_lru_cache(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('lru-cache')))
    .ncc({ packageName: 'lru-cache', externals })
    .target('compiled/lru-cache')
}
// eslint-disable-next-line camelcase
externals['nanoid'] = 'next/dist/compiled/nanoid'
export async function ncc_nanoid(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('nanoid')))
    .ncc({ packageName: 'nanoid', externals })
    .target('compiled/nanoid')
}
// eslint-disable-next-line camelcase
externals['node-fetch'] = 'next/dist/compiled/node-fetch'
export async function ncc_node_fetch(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('node-fetch')))
    .ncc({ packageName: 'node-fetch', externals })
    .target('compiled/node-fetch')
}
// eslint-disable-next-line camelcase
externals['ora'] = 'next/dist/compiled/ora'
export async function ncc_ora(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('ora')))
    .ncc({ packageName: 'ora', externals })
    .target('compiled/ora')
}
// eslint-disable-next-line camelcase
externals['postcss-flexbugs-fixes'] =
  'next/dist/compiled/postcss-flexbugs-fixes'
export async function ncc_postcss_flexbugs_fixes(task, opts) {
  await task
    .source(
      opts.src || relative(__dirname, require.resolve('postcss-flexbugs-fixes'))
    )
    .ncc({ packageName: 'postcss-flexbugs-fixes', externals })
    .target('compiled/postcss-flexbugs-fixes')
}
// eslint-disable-next-line camelcase
externals['postcss-loader'] = 'next/dist/compiled/postcss-loader'
export async function ncc_postcss_loader(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('postcss-loader')))
    .ncc({ packageName: 'postcss-loader', externals })
    .target('compiled/postcss-loader')
}
// eslint-disable-next-line camelcase
externals['postcss-preset-env'] = 'next/dist/compiled/postcss-preset-env'
export async function ncc_postcss_preset_env(task, opts) {
  await task
    .source(
      opts.src || relative(__dirname, require.resolve('postcss-preset-env'))
    )
    .ncc({ packageName: 'postcss-preset-env', externals })
    .target('compiled/postcss-preset-env')
}
// eslint-disable-next-line camelcase
externals['raw-body'] = 'next/dist/compiled/raw-body'
export async function ncc_raw_body(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('raw-body')))
    .ncc({ packageName: 'raw-body', externals })
    .target('compiled/raw-body')
}
// eslint-disable-next-line camelcase
externals['recast'] = 'next/dist/compiled/recast'
export async function ncc_recast(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('recast')))
    .ncc({ packageName: 'recast', externals })
    .target('compiled/recast')
}
// eslint-disable-next-line camelcase
// NB: Used by other dependencies, but Vercel version is a duplicate
// version so can be inlined anyway (although may change in future)
externals['resolve'] = 'next/dist/compiled/resolve'
export async function ncc_resolve(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('resolve')))
    .ncc({ packageName: 'resolve', externals })
    .target('compiled/resolve')
}
// eslint-disable-next-line camelcase
externals['send'] = 'next/dist/compiled/send'
export async function ncc_send(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('send')))
    .ncc({ packageName: 'send', externals })
    .target('compiled/send')
}
// eslint-disable-next-line camelcase
// NB: Used by other dependencies, but Vercel version is a duplicate
// version so can be inlined anyway (although may change in future)
externals['source-map'] = 'next/dist/compiled/source-map'
export async function ncc_source_map(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('source-map')))
    .ncc({ packageName: 'source-map', externals })
    .target('compiled/source-map')
}
// eslint-disable-next-line camelcase
externals['string-hash'] = 'next/dist/compiled/string-hash'
export async function ncc_string_hash(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('string-hash')))
    .ncc({ packageName: 'string-hash', externals })
    .target('compiled/string-hash')
}
// eslint-disable-next-line camelcase
externals['strip-ansi'] = 'next/dist/compiled/strip-ansi'
export async function ncc_strip_ansi(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('strip-ansi')))
    .ncc({ packageName: 'strip-ansi', externals })
    .target('compiled/strip-ansi')
}
// eslint-disable-next-line camelcase
externals['terser'] = 'next/dist/compiled/terser'
export async function ncc_terser(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('terser')))
    .ncc({ packageName: 'terser', externals })
    .target('compiled/terser')
}
// eslint-disable-next-line camelcase
externals['text-table'] = 'next/dist/compiled/text-table'
export async function ncc_text_table(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('text-table')))
    .ncc({ packageName: 'text-table', externals })
    .target('compiled/text-table')
}
// eslint-disable-next-line camelcase
externals['thread-loader'] = 'next/dist/compiled/thread-loader'
export async function ncc_thread_loader(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('thread-loader')))
    .ncc({ packageName: 'thread-loader', externals })
    .target('compiled/thread-loader')
}
// eslint-disable-next-line camelcase
externals['unistore'] = 'next/dist/compiled/unistore'
export async function ncc_unistore(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('unistore')))
    .ncc({ packageName: 'unistore', externals })
    .target('compiled/unistore')
}
// eslint-disable-next-line camelcase
externals['webpack-dev-middleware'] =
  'next/dist/compiled/webpack-dev-middleware'
export async function ncc_webpack_dev_middleware(task, opts) {
  await task
    .source(
      opts.src || relative(__dirname, require.resolve('webpack-dev-middleware'))
    )
    .ncc({ packageName: 'webpack-dev-middleware', externals })
    .target('compiled/webpack-dev-middleware')
}
// eslint-disable-next-line camelcase
externals['webpack-hot-middleware'] =
  'next/dist/compiled/webpack-hot-middleware'
export async function ncc_webpack_hot_middleware(task, opts) {
  await task
    .source(
      opts.src || relative(__dirname, require.resolve('webpack-hot-middleware'))
    )
    .ncc({ packageName: 'webpack-hot-middleware', externals })
    .target('compiled/webpack-hot-middleware')
}
externals['terser-webpack-plugin'] = 'next/dist/compiled/terser-webpack-plugin'
export async function ncc_terser_webpack_plugin(task, opts) {
  await task
    .source(
      opts.src || relative(__dirname, require.resolve('terser-webpack-plugin'))
    )
    .ncc({ packageName: 'terser-webpack-plugin', externals })
    .target('compiled/terser-webpack-plugin')
}

externals['path-to-regexp'] = 'next/dist/compiled/path-to-regexp'
export async function path_to_regexp(task, opts) {
  await task
    .source(opts.src || relative(__dirname, require.resolve('path-to-regexp')))
    .target('dist/compiled/path-to-regexp')
}

export async function precompile(task) {
  await task.parallel(['browser_polyfills', 'path_to_regexp', 'copy_ncced'])
}

// eslint-disable-next-line camelcase
export async function copy_ncced(task) {
  // we don't ncc every time we build since these won't change
  // that often and can be committed to the repo saving build time
  await task.source('compiled/**/*').target('dist/compiled')
}

export async function ncc(task) {
  await task
    .clear('compiled')
    .parallel([
      'ncc_amphtml_validator',
      'ncc_arg',
      'ncc_async_retry',
      'ncc_async_sema',
      'ncc_autodll_webpack_plugin',
      'ncc_babel_loader',
      'ncc_cache_loader',
      'ncc_chalk',
      'ncc_ci_info',
      'ncc_compression',
      'ncc_conf',
      'ncc_content_type',
      'ncc_cookie',
      'ncc_cssnano_simple',
      'ncc_debug',
      'ncc_devalue',
      'ncc_dotenv',
      'ncc_dotenv_expand',
      'ncc_escape_string_regexp',
      'ncc_etag',
      'ncc_file_loader',
      'ncc_find_up',
      'ncc_fresh',
      'ncc_gzip_size',
      'ncc_http_proxy',
      'ncc_ignore_loader',
      'ncc_is_docker',
      'ncc_is_wsl',
      'ncc_json5',
      'ncc_jsonwebtoken',
      'ncc_launch_editor',
      'ncc_lodash_curry',
      'ncc_lru_cache',
      'ncc_nanoid',
      'ncc_node_fetch',
      'ncc_ora',
      'ncc_postcss_flexbugs_fixes',
      'ncc_postcss_loader',
      'ncc_postcss_preset_env',
      'ncc_raw_body',
      'ncc_recast',
      'ncc_resolve',
      'ncc_send',
      'ncc_source_map',
      'ncc_string_hash',
      'ncc_strip_ansi',
      'ncc_terser',
      'ncc_text_table',
      'ncc_thread_loader',
      'ncc_unistore',
      'ncc_webpack_dev_middleware',
      'ncc_webpack_hot_middleware',
      'ncc_terser_webpack_plugin',
    ])
}

export async function compile(task) {
  await task.parallel([
    'cli',
    'bin',
    'server',
    'nextbuild',
    'nextbuildstatic',
    'pages',
    'lib',
    'client',
    'telemetry',
    'nextserverserver',
    'nextserverlib',
  ])
}

export async function bin(task, opts) {
  await task
    .source(opts.src || 'bin/*')
    .babel('server', { stripExtension: true })
    .target('dist/bin', { mode: '0755' })
  notify('Compiled binaries')
}

export async function cli(task, opts) {
  await task
    .source(opts.src || 'cli/**/*.+(js|ts|tsx)')
    .babel('server')
    .target('dist/cli')
  notify('Compiled cli files')
}

export async function lib(task, opts) {
  await task
    .source(opts.src || 'lib/**/*.+(js|ts|tsx)')
    .babel('server')
    .target('dist/lib')
  notify('Compiled lib files')
}

export async function server(task, opts) {
  await task
    .source(opts.src || 'server/**/*.+(js|ts|tsx)')
    .babel('server')
    .target('dist/server')
  notify('Compiled server files')
}

export async function nextbuild(task, opts) {
  await task
    .source(opts.src || 'build/**/*.+(js|ts|tsx)')
    .babel('server')
    .target('dist/build')
  notify('Compiled build files')
}

export async function client(task, opts) {
  await task
    .source(opts.src || 'client/**/*.+(js|ts|tsx)')
    .babel('client')
    .target('dist/client')
  notify('Compiled client files')
}

// export is a reserved keyword for functions
export async function nextbuildstatic(task, opts) {
  await task
    .source(opts.src || 'export/**/*.+(js|ts|tsx)')
    .babel('server')
    .target('dist/export')
  notify('Compiled export files')
}

export async function pages_app(task) {
  await task.source('pages/_app.tsx').babel('client').target('dist/pages')
}

export async function pages_error(task) {
  await task.source('pages/_error.tsx').babel('client').target('dist/pages')
}

export async function pages_document(task) {
  await task.source('pages/_document.tsx').babel('server').target('dist/pages')
}

export async function pages(task, opts) {
  await task.parallel(['pages_app', 'pages_error', 'pages_document'])
}

export async function telemetry(task, opts) {
  await task
    .source(opts.src || 'telemetry/**/*.+(js|ts|tsx)')
    .babel('server')
    .target('dist/telemetry')
  notify('Compiled telemetry files')
}

export async function build(task) {
  await task.serial(['precompile', 'compile'])
}

export default async function (task) {
  await task.clear('dist')
  await task.start('build')
  await task.watch('bin/*', 'bin')
  await task.watch('pages/**/*.+(js|ts|tsx)', 'pages')
  await task.watch('server/**/*.+(js|ts|tsx)', 'server')
  await task.watch('build/**/*.+(js|ts|tsx)', 'nextbuild')
  await task.watch('export/**/*.+(js|ts|tsx)', 'nextbuildstatic')
  await task.watch('client/**/*.+(js|ts|tsx)', 'client')
  await task.watch('lib/**/*.+(js|ts|tsx)', 'lib')
  await task.watch('cli/**/*.+(js|ts|tsx)', 'cli')
  await task.watch('telemetry/**/*.+(js|ts|tsx)', 'telemetry')
  await task.watch('next-server/server/**/*.+(js|ts|tsx)', 'nextserverserver')
  await task.watch('next-server/lib/**/*.+(js|ts|tsx)', 'nextserverlib')
}

export async function nextserverlib(task, opts) {
  await task
    .source(opts.src || 'next-server/lib/**/*.+(js|ts|tsx)')
    .babel('server')
    .target('dist/next-server/lib')
  notify('Compiled lib files')
}

export async function nextserverserver(task, opts) {
  await task
    .source(opts.src || 'next-server/server/**/*.+(js|ts|tsx)')
    .babel('server')
    .target('dist/next-server/server')
  notify('Compiled server files')
}

export async function nextserverbuild(task) {
  await task.parallel(['nextserverserver', 'nextserverlib'])
}

export async function release(task) {
  await task.clear('dist').start('build')
  await task.clear('dist/next-server').start('nextserverbuild')
}

// notification helper
function notify(msg) {
  return notifier.notify({
    title: '▲ Next',
    message: msg,
    icon: false,
  })
}
