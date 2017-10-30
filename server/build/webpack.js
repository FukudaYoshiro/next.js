import { resolve, join, sep } from 'path'
import { createHash } from 'crypto'
import webpack from 'webpack'
import glob from 'glob-promise'
import WriteFilePlugin from 'write-file-webpack-plugin'
import FriendlyErrorsWebpackPlugin from 'friendly-errors-webpack-plugin'
import CaseSensitivePathPlugin from 'case-sensitive-paths-webpack-plugin'
import UnlinkFilePlugin from './plugins/unlink-file-plugin'
import PagesPlugin from './plugins/pages-plugin'
import DynamicChunksPlugin from './plugins/dynamic-chunks-plugin'
import CombineAssetsPlugin from './plugins/combine-assets-plugin'
import getConfig from '../config'
import * as babelCore from 'babel-core'
import findBabelConfig from './babel/find-config'
import rootModuleRelativePath from './root-module-relative-path'

const documentPage = join('pages', '_document.js')
const defaultPages = [
  '_error.js',
  '_document.js'
]
const nextPagesDir = join(__dirname, '..', '..', 'pages')
const nextNodeModulesDir = join(__dirname, '..', '..', '..', 'node_modules')
const interpolateNames = new Map(defaultPages.map((p) => {
  return [join(nextPagesDir, p), `dist/pages/${p}`]
}))

const relativeResolve = rootModuleRelativePath(require)

export default async function createCompiler (dir, { buildId, dev = false, quiet = false, buildDir, conf = null } = {}) {
  dir = resolve(dir)
  const config = getConfig(dir, conf)
  const defaultEntries = dev ? [
    join(__dirname, '..', '..', 'client', 'webpack-hot-middleware-client'),
    join(__dirname, '..', '..', 'client', 'on-demand-entries-client')
  ] : []
  const mainJS = dev
    ? require.resolve('../../client/next-dev') : require.resolve('../../client/next')

  let totalPages

  const entry = async () => {
    const entries = {
      'main.js': [
        ...defaultEntries,
        ...config.clientBootstrap || [],
        mainJS
      ]
    }

    const pages = await glob('pages/**/*.js', { cwd: dir })
    const devPages = pages.filter((p) => p === 'pages/_document.js' || p === 'pages/_error.js')

    // In the dev environment, on-demand-entry-handler will take care of
    // managing pages.
    if (dev) {
      for (const p of devPages) {
        entries[join('bundles', p)] = [`./${p}?entry`]
      }
    } else {
      for (const p of pages) {
        entries[join('bundles', p)] = [`./${p}?entry`]
      }
    }

    for (const p of defaultPages) {
      const entryName = join('bundles', 'pages', p)
      if (!entries[entryName]) {
        entries[entryName] = [join(nextPagesDir, p) + '?entry']
      }
    }

    totalPages = pages.filter((p) => p !== documentPage).length

    return entries
  }

  const plugins = [
    new webpack.IgnorePlugin(/(precomputed)/, /node_modules.+(elliptic)/),
    new webpack.LoaderOptionsPlugin({
      options: {
        context: dir,
        customInterpolateName (url, name, opts) {
          return interpolateNames.get(this.resourcePath) || url
        }
      }
    }),
    new WriteFilePlugin({
      exitOnErrors: false,
      log: false,
      // required not to cache removed files
      useHashIndex: false
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'commons',
      filename: 'commons.js',
      minChunks (module, count) {
        // We need to move react-dom explicitly into common chunks.
        // Otherwise, if some other page or module uses it, it might
        // included in that bundle too.
        if (module.context && module.context.indexOf(`${sep}react-dom${sep}`) >= 0) {
          return true
        }

        // In the dev we use on-demand-entries.
        // So, it makes no sense to use commonChunks based on the minChunks count.
        // Instead, we move all the code in node_modules into each of the pages.
        if (dev) {
          return false
        }

        // If there are one or two pages, only move modules to common if they are
        // used in all of the pages. Otherwise, move modules used in at-least
        // 1/2 of the total pages into commons.
        if (totalPages <= 2) {
          return count >= totalPages
        }
        return count >= totalPages * 0.5
      }
    }),
    // This chunk contains all the webpack related code. So, all the changes
    // related to that happens to this chunk.
    // It won't touch commons.js and that gives us much better re-build perf.
    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest',
      filename: 'manifest.js'
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production')
    }),
    new PagesPlugin(),
    new DynamicChunksPlugin(),
    new CaseSensitivePathPlugin()
  ]

  if (dev) {
    plugins.push(
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin(),
      new UnlinkFilePlugin()
    )
    if (!quiet) {
      plugins.push(new FriendlyErrorsWebpackPlugin())
    }
  } else {
    plugins.push(new webpack.IgnorePlugin(/react-hot-loader/))
    plugins.push(
      new CombineAssetsPlugin({
        input: ['manifest.js', 'commons.js', 'main.js'],
        output: 'app.js'
      }),
      new webpack.optimize.UglifyJsPlugin({
        compress: { warnings: false },
        sourceMap: false
      })
    )
    plugins.push(new webpack.optimize.ModuleConcatenationPlugin())
  }

  const nodePathList = (process.env.NODE_PATH || '')
    .split(process.platform === 'win32' ? ';' : ':')
    .filter((p) => !!p)

  const mainBabelOptions = {
    cacheDirectory: true,
    presets: []
  }

  const externalBabelConfig = findBabelConfig(dir)
  if (externalBabelConfig) {
    console.log(`> Using external babel configuration`)
    console.log(`> Location: "${externalBabelConfig.loc}"`)
    // It's possible to turn off babelrc support via babelrc itself.
    // In that case, we should add our default preset.
    // That's why we need to do this.
    const { options } = externalBabelConfig
    mainBabelOptions.babelrc = options.babelrc !== false
  } else {
    mainBabelOptions.babelrc = false
  }

  // Add our default preset if the no "babelrc" found.
  if (!mainBabelOptions.babelrc) {
    mainBabelOptions.presets.push(require.resolve('./babel/preset'))
  }

  const rules = (dev ? [{
    test: /\.js(\?[^?]*)?$/,
    loader: 'hot-self-accept-loader',
    include: [
      join(dir, 'pages'),
      nextPagesDir
    ]
  }, {
    test: /\.js(\?[^?]*)?$/,
    loader: 'react-hot-loader/webpack',
    exclude: /node_modules/
  }] : [])
  .concat([{
    test: /\.json$/,
    loader: 'json-loader'
  }, {
    test: /\.(js|json)(\?[^?]*)?$/,
    loader: 'emit-file-loader',
    include: [dir, nextPagesDir],
    exclude (str) {
      return /node_modules/.test(str) && str.indexOf(nextPagesDir) !== 0
    },
    options: {
      name: 'dist/[path][name].[ext]',
      // By default, our babel config does not transpile ES2015 module syntax because
      // webpack knows how to handle them. (That's how it can do tree-shaking)
      // But Node.js doesn't know how to handle them. So, we have to transpile them here.
      transform ({ content, sourceMap, interpolatedName }) {
        // Only handle .js files
        if (!(/\.js$/.test(interpolatedName))) {
          return { content, sourceMap }
        }

        const transpiled = babelCore.transform(content, {
          babelrc: false,
          sourceMaps: dev ? 'both' : false,
          // Here we need to resolve all modules to the absolute paths.
          // Earlier we did it with the babel-preset.
          // But since we don't transpile ES2015 in the preset this is not resolving.
          // That's why we need to do it here.
          // See more: https://github.com/zeit/next.js/issues/951
          plugins: [
            [require.resolve('babel-plugin-transform-es2015-modules-commonjs')],
            [
              require.resolve('babel-plugin-module-resolver'),
              {
                alias: {
                  'babel-runtime': relativeResolve('babel-runtime/package'),
                  'next/link': relativeResolve('../../lib/link'),
                  'next/prefetch': relativeResolve('../../lib/prefetch'),
                  'next/css': relativeResolve('../../lib/css'),
                  'next/dynamic': relativeResolve('../../lib/dynamic'),
                  'next/head': relativeResolve('../../lib/head'),
                  'next/document': relativeResolve('../../server/document'),
                  'next/router': relativeResolve('../../lib/router'),
                  'next/error': relativeResolve('../../lib/error'),
                  'styled-jsx/style': relativeResolve('styled-jsx/style')
                }
              }
            ]
          ],
          inputSourceMap: sourceMap
        })

        // Strip ?entry to map back to filesystem and work with iTerm, etc.
        let { map } = transpiled
        let output = transpiled.code

        if (map) {
          let nodeMap = Object.assign({}, map)
          nodeMap.sources = nodeMap.sources.map((source) => source.replace(/\?entry/, ''))
          delete nodeMap.sourcesContent

          // Output explicit inline source map that source-map-support can pickup via requireHook mode.
          // Since these are not formal chunks, the devtool infrastructure in webpack does not output
          // a source map for these files.
          const sourceMapUrl = new Buffer(JSON.stringify(nodeMap), 'utf-8').toString('base64')
          output = `${output}\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${sourceMapUrl}`
        }

        return {
          content: output,
          sourceMap: transpiled.map
        }
      }
    }
  }, {
    loader: 'babel-loader',
    include: nextPagesDir,
    exclude (str) {
      return /node_modules/.test(str) && str.indexOf(nextPagesDir) !== 0
    },
    options: {
      babelrc: false,
      cacheDirectory: true,
      presets: [require.resolve('./babel/preset')]
    }
  }, {
    test: /\.js(\?[^?]*)?$/,
    loader: 'babel-loader',
    include: [dir],
    exclude (str) {
      return /node_modules/.test(str)
    },
    options: mainBabelOptions
  }])

  let webpackConfig = {
    context: dir,
    entry,
    output: {
      path: buildDir ? join(buildDir, '.next') : join(dir, config.distDir),
      filename: '[name]',
      libraryTarget: 'commonjs2',
      publicPath: `/_next/${buildId}/webpack/`,
      strictModuleExceptionHandling: true,
      devtoolModuleFilenameTemplate ({ resourcePath }) {
        const hash = createHash('sha1')
        hash.update(Date.now() + '')
        const id = hash.digest('hex').slice(0, 7)

        // append hash id for cache busting
        return `webpack:///${resourcePath}?${id}`
      },
      // This saves chunks with the name given via require.ensure()
      chunkFilename: '[name]'
    },
    resolve: {
      modules: [
        nextNodeModulesDir,
        'node_modules',
        ...nodePathList
      ]
    },
    resolveLoader: {
      modules: [
        nextNodeModulesDir,
        'node_modules',
        join(__dirname, 'loaders'),
        ...nodePathList
      ]
    },
    plugins,
    module: {
      rules
    },
    devtool: dev ? 'cheap-module-inline-source-map' : false,
    performance: { hints: false }
  }

  if (config.webpack) {
    console.log(`> Using "webpack" config function defined in ${config.configOrigin}.`)
    webpackConfig = await config.webpack(webpackConfig, { buildId, dev })
  }
  return webpack(webpackConfig)
}
