import { Compiler, Plugin } from 'webpack'
import { extname } from 'path'

// Prevents outputting client pages when they are not needed
export class DropClientPage implements Plugin {
  ampPages = new Set()

  apply(compiler: Compiler) {
    compiler.hooks.emit.tap('DropClientPage', (compilation) => {
      Object.keys(compilation.assets).forEach((assetKey) => {
        const asset = compilation.assets[assetKey]

        if (asset?._value?.includes?.('__NEXT_DROP_CLIENT_FILE__')) {
          const cleanAssetKey = assetKey.replace(/\\/g, '/')
          const page = '/' + cleanAssetKey.split('pages/')[1]
          const pageNoExt = page.split(extname(page))[0]

          delete compilation.assets[assetKey]

          // Detect being re-ran through a child compiler and don't re-mark the
          // page as AMP
          if (!pageNoExt.endsWith('.module')) {
            this.ampPages.add(pageNoExt.replace(/\/index$/, '') || '/')
          }
        }
      })
    })
  }
}
