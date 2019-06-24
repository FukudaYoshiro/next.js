/* global document */
import mitt from 'next-server/dist/lib/mitt'
import unfetch from 'unfetch'

// smaller version of https://gist.github.com/igrigorik/a02f2359f3bc50ca7a9c
function supportsPreload (list) {
  if (!list || !list.supports) {
    return false
  }
  try {
    return list.supports('preload')
  } catch (e) {
    return false
  }
}

const hasPreload = supportsPreload(document.createElement('link').relList)

export default class PageLoader {
  constructor (buildId, assetPrefix) {
    this.buildId = buildId
    this.assetPrefix = assetPrefix

    this.pageCache = {}
    this.prefetchCache = new Set()
    this.pageRegisterEvents = mitt()
    this.loadingRoutes = {}
    this.promisedBuildId = Promise.resolve()
  }

  normalizeRoute (route) {
    if (route[0] !== '/') {
      throw new Error(`Route name should start with a "/", got "${route}"`)
    }
    route = route.replace(/\/index$/, '/')

    if (route === '/') return route
    return route.replace(/\/$/, '')
  }

  loadPage (route) {
    route = this.normalizeRoute(route)

    return new Promise((resolve, reject) => {
      const fire = ({ error, page }) => {
        this.pageRegisterEvents.off(route, fire)
        delete this.loadingRoutes[route]

        if (error) {
          reject(error)
        } else {
          resolve(page)
        }
      }

      // If there's a cached version of the page, let's use it.
      const cachedPage = this.pageCache[route]
      if (cachedPage) {
        const { error, page } = cachedPage
        error ? reject(error) : resolve(page)
        return
      }

      // Register a listener to get the page
      this.pageRegisterEvents.on(route, fire)

      // If the page is loading via SSR, we need to wait for it
      // rather downloading it again.
      if (document.getElementById(`__NEXT_PAGE__${route}`)) {
        return
      }

      // Load the script if not asked to load yet.
      if (!this.loadingRoutes[route]) {
        this.loadScript(route)
        this.loadingRoutes[route] = true
      }
    })
  }

  onDynamicBuildId () {
    this.promisedBuildId = new Promise(resolve => {
      unfetch(`${this.assetPrefix}/_next/static/HEAD_BUILD_ID`)
        .then(res => {
          if (res.ok) {
            return res
          }

          const err = new Error('Failed to fetch HEAD buildId')
          err.res = res
          throw err
        })
        .then(res => res.text())
        .then(buildId => {
          this.buildId = buildId.trim()
        })
        .catch(() => {
          // When this fails it's not a _huge_ deal, preload wont work and page
          // navigation will 404, triggering a SSR refresh
          console.warn(
            'Failed to load BUILD_ID from server. ' +
              'The following client-side page transition will likely 404 and cause a SSR.\n' +
              'http://err.sh/zeit/next.js/head-build-id'
          )
        })
        .then(resolve, resolve)
    })
  }

  async loadScript (route) {
    await this.promisedBuildId

    route = this.normalizeRoute(route)
    const scriptRoute = route === '/' ? '/index.js' : `${route}.js`

    const script = document.createElement('script')
    const url = `${this.assetPrefix}/_next/static/${encodeURIComponent(
      this.buildId
    )}/pages${scriptRoute}`
    script.crossOrigin = process.crossOrigin
    script.src = url
    script.onerror = () => {
      const error = new Error(`Error loading script ${url}`)
      error.code = 'PAGE_LOAD_ERROR'
      this.pageRegisterEvents.emit(route, { error })
    }

    document.body.appendChild(script)
  }

  // This method if called by the route code.
  registerPage (route, regFn) {
    const register = () => {
      try {
        const { error, page } = regFn()
        this.pageCache[route] = { error, page }
        this.pageRegisterEvents.emit(route, { error, page })
      } catch (error) {
        this.pageCache[route] = { error }
        this.pageRegisterEvents.emit(route, { error })
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      // Wait for webpack to become idle if it's not.
      // More info: https://github.com/zeit/next.js/pull/1511
      if (module.hot && module.hot.status() !== 'idle') {
        console.log(
          `Waiting for webpack to become "idle" to initialize the page: "${route}"`
        )

        const check = status => {
          if (status === 'idle') {
            module.hot.removeStatusHandler(check)
            register()
          }
        }
        module.hot.status(check)
        return
      }
    }

    register()
  }

  async prefetch (route) {
    route = this.normalizeRoute(route)
    const scriptRoute = `${route === '/' ? '/index' : route}.js`

    if (
      this.prefetchCache.has(scriptRoute) ||
      document.getElementById(`__NEXT_PAGE__${route}`)
    ) {
      return
    }
    this.prefetchCache.add(scriptRoute)

    // Inspired by quicklink, license: https://github.com/GoogleChromeLabs/quicklink/blob/master/LICENSE
    // Don't prefetch if the user is on 2G / Don't prefetch if Save-Data is enabled
    if ('connection' in navigator) {
      if (
        (navigator.connection.effectiveType || '').indexOf('2g') !== -1 ||
        navigator.connection.saveData
      ) {
        return
      }
    }

    // Feature detection is used to see if preload is supported
    // If not fall back to loading script tags before the page is loaded
    // https://caniuse.com/#feat=link-rel-preload
    if (hasPreload) {
      await this.promisedBuildId

      const link = document.createElement('link')
      link.rel = 'preload'
      link.crossOrigin = process.crossOrigin
      link.href = `${this.assetPrefix}/_next/static/${encodeURIComponent(
        this.buildId
      )}/pages${scriptRoute}`
      link.as = 'script'
      document.head.appendChild(link)
      return
    }

    if (document.readyState === 'complete') {
      return this.loadPage(route).catch(() => {})
    } else {
      return new Promise(resolve => {
        window.addEventListener('load', () => {
          this.loadPage(route).then(() => resolve(), () => resolve())
        })
      })
    }
  }

  clearCache (route) {
    route = this.normalizeRoute(route)
    delete this.pageCache[route]
    delete this.loadingRoutes[route]

    const script = document.getElementById(`__NEXT_PAGE__${route}`)
    if (script) {
      script.parentNode.removeChild(script)
    }
  }
}
