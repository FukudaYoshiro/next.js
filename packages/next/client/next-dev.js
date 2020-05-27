/* globals __REPLACE_NOOP_IMPORT__ */
import initNext, * as next from './'
import EventSourcePolyfill from './dev/event-source-polyfill'
import initOnDemandEntries from './dev/on-demand-entries-client'
import initWebpackHMR from './dev/webpack-hot-middleware-client'
import initializeBuildWatcher from './dev/dev-build-watcher'
import initializePrerenderIndicator from './dev/prerender-indicator'
import { displayContent } from './dev/fouc'

// Temporary workaround for the issue described here:
// https://github.com/vercel/next.js/issues/3775#issuecomment-407438123
// The runtimeChunk doesn't have dynamic import handling code when there hasn't been a dynamic import
// The runtimeChunk can't hot reload itself currently to correct it when adding pages using on-demand-entries
// eslint-disable-next-line no-unused-expressions
__REPLACE_NOOP_IMPORT__

// Support EventSource on Internet Explorer 11
if (!window.EventSource) {
  window.EventSource = EventSourcePolyfill
}

const {
  __NEXT_DATA__: { assetPrefix },
} = window

const prefix = assetPrefix || ''
const webpackHMR = initWebpackHMR({ assetPrefix: prefix })

window.next = next
initNext({ webpackHMR })
  .then(({ emitter, renderCtx, render }) => {
    initOnDemandEntries({ assetPrefix: prefix })
    if (process.env.__NEXT_BUILD_INDICATOR) initializeBuildWatcher()
    if (
      process.env.__NEXT_PRERENDER_INDICATOR &&
      // disable by default in electron
      !(typeof process !== 'undefined' && 'electron' in process.versions)
    ) {
      initializePrerenderIndicator()
    }

    // delay rendering until after styles have been applied in development
    displayContent(() => {
      render(renderCtx)
    })
  })
  .catch((err) => {
    console.error('Error was not caught', err)
  })
