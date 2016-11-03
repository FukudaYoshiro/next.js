import { resolve, join } from 'path'
import webpack from 'webpack'
import glob from 'glob-promise'
import WriteFilePlugin from 'write-file-webpack-plugin'
import UnlinkFilePlugin from './plugins/unlink-file-plugin'
import WatchPagesPlugin from './plugins/watch-pages-plugin'
import WatchRemoveEventPlugin from './plugins/watch-remove-event-plugin'
import DynamicEntryPlugin from './plugins/dynamic-entry-plugin'
import DetachPlugin from './plugins/detach-plugin'

export default async function createCompiler (dir, { hotReload = false } = {}) {
  dir = resolve(dir)

  const pages = await glob('pages/**/*.js', { cwd: dir })

  const entry = {}
  const defaultEntries = hotReload ? ['webpack/hot/dev-server'] : []
  for (const p of pages) {
    entry[join('bundles', p)] = defaultEntries.concat(['./' + p])
  }

  const nextPagesDir = join(__dirname, '..', '..', 'pages')

  const errorEntry = join('bundles', 'pages', '_error.js')
  const defaultErrorPath = join(nextPagesDir, '_error.js')
  if (!entry[errorEntry]) {
    entry[errorEntry] = defaultEntries.concat([defaultErrorPath])
  }

  const errorDebugEntry = join('bundles', 'pages', '_error-debug.js')
  const errorDebugPath = join(nextPagesDir, '_error-debug.js')
  entry[errorDebugEntry] = errorDebugPath

  const nodeModulesDir = join(__dirname, '..', '..', '..', 'node_modules')

  const plugins = [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new WriteFilePlugin({
      exitOnErrors: false,
      log: false,
      // required not to cache removed files
      useHashIndex: false
    })
  ].concat(hotReload ? [
    new webpack.HotModuleReplacementPlugin(),
    new DetachPlugin(),
    new DynamicEntryPlugin(),
    new UnlinkFilePlugin(),
    new WatchRemoveEventPlugin(),
    new WatchPagesPlugin(dir)
  ] : [
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false },
      sourceMap: false
    })
  ])

  const babelRuntimePath = require.resolve('babel-runtime/package')
  .replace(/[\\\/]package\.json$/, '')

  const loaders = [{
    test: /\.js$/,
    loader: 'emit-file-loader',
    include: [dir, nextPagesDir],
    exclude (str) {
      return /node_modules/.test(str) && str.indexOf(nextPagesDir) !== 0
    },
    query: {
      name: 'dist/[path][name].[ext]'
    }
  }]
  .concat(hotReload ? [{
    test: /\.js$/,
    loader: 'hot-self-accept-loader',
    include: [
      join(dir, 'pages'),
      nextPagesDir
    ]
  }] : [])
  .concat([{
    test: /\.js$/,
    loader: 'babel',
    include: [dir, nextPagesDir],
    exclude (str) {
      return /node_modules/.test(str) && str.indexOf(nextPagesDir) !== 0
    },
    query: {
      presets: ['es2015', 'react'],
      plugins: [
        require.resolve('babel-plugin-transform-async-to-generator'),
        require.resolve('babel-plugin-transform-object-rest-spread'),
        require.resolve('babel-plugin-transform-class-properties'),
        require.resolve('babel-plugin-transform-runtime'),
        [
          require.resolve('babel-plugin-module-resolver'),
          {
            alias: {
              'babel-runtime': babelRuntimePath,
              react: require.resolve('react'),
              'next/link': require.resolve('../../lib/link'),
              'next/css': require.resolve('../../lib/css'),
              'next/head': require.resolve('../../lib/head')
            }
          }
        ]
      ]
    }
  }])

  const interpolateNames = new Map([
    [defaultErrorPath, 'dist/pages/_error.js'],
    [errorDebugPath, 'dist/pages/_error-debug.js']
  ])

  return webpack({
    context: dir,
    entry,
    output: {
      path: join(dir, '.next'),
      filename: '[name]',
      libraryTarget: 'commonjs2',
      publicPath: hotReload ? 'http://localhost:3030/' : null
    },
    externals: [
      'react',
      'react-dom',
      {
        [require.resolve('react')]: 'react',
        [require.resolve('../../lib/link')]: 'next/link',
        [require.resolve('../../lib/css')]: 'next/css',
        [require.resolve('../../lib/head')]: 'next/head'
      }
    ],
    resolve: {
      root: [
        nodeModulesDir,
        join(dir, 'node_modules')
      ]
    },
    resolveLoader: {
      root: [
        nodeModulesDir,
        join(__dirname, 'loaders')
      ]
    },
    plugins,
    module: {
      preLoaders: [
        { test: /\.json$/, loader: 'json-loader' }
      ],
      loaders
    },
    customInterpolateName: function (url, name, opts) {
      return interpolateNames.get(this.resourcePath) || url
    }
  })
}
