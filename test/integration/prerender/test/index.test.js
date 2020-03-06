/* eslint-env jest */
/* global jasmine */
import cheerio from 'cheerio'
import escapeRegex from 'escape-string-regexp'
import fs from 'fs-extra'
import {
  check,
  fetchViaHTTP,
  findPort,
  getReactErrorOverlayContent,
  initNextServerScript,
  killApp,
  launchApp,
  nextBuild,
  nextExport,
  nextStart,
  normalizeRegEx,
  renderViaHTTP,
  startStaticServer,
  stopApp,
  waitFor,
} from 'next-test-utils'
import webdriver from 'next-webdriver'
import { dirname, join } from 'path'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 2
const appDir = join(__dirname, '..')
const nextConfig = join(appDir, 'next.config.js')
const indexPage = join(__dirname, '../pages/index.js')
let app
let appPort
let buildId
let distPagesDir
let exportDir
let stderr

const startServer = async (optEnv = {}) => {
  const scriptPath = join(appDir, 'server.js')
  const env = Object.assign(
    {},
    { ...process.env },
    { PORT: `${appPort}` },
    optEnv
  )

  return initNextServerScript(
    scriptPath,
    /ready on/i,
    env,
    /ReferenceError: options is not defined/
  )
}

const expectedManifestRoutes = () => ({
  '/': {
    dataRoute: `/_next/data/${buildId}/index.json`,
    initialRevalidateSeconds: 1,
    srcRoute: null,
  },
  '/blog/[post3]': {
    dataRoute: `/_next/data/${buildId}/blog/[post3].json`,
    initialRevalidateSeconds: 10,
    srcRoute: '/blog/[post]',
  },
  '/blog/post-1': {
    dataRoute: `/_next/data/${buildId}/blog/post-1.json`,
    initialRevalidateSeconds: 10,
    srcRoute: '/blog/[post]',
  },
  '/blog/post-2': {
    dataRoute: `/_next/data/${buildId}/blog/post-2.json`,
    initialRevalidateSeconds: 10,
    srcRoute: '/blog/[post]',
  },
  '/blog/post-4': {
    dataRoute: `/_next/data/${buildId}/blog/post-4.json`,
    initialRevalidateSeconds: 10,
    srcRoute: '/blog/[post]',
  },
  '/blog/post-1/comment-1': {
    dataRoute: `/_next/data/${buildId}/blog/post-1/comment-1.json`,
    initialRevalidateSeconds: 2,
    srcRoute: '/blog/[post]/[comment]',
  },
  '/blog/post-2/comment-2': {
    dataRoute: `/_next/data/${buildId}/blog/post-2/comment-2.json`,
    initialRevalidateSeconds: 2,
    srcRoute: '/blog/[post]/[comment]',
  },
  '/blog/post.1': {
    dataRoute: `/_next/data/${buildId}/blog/post.1.json`,
    initialRevalidateSeconds: 10,
    srcRoute: '/blog/[post]',
  },
  '/catchall-explicit/another/value': {
    dataRoute: `/_next/data/${buildId}/catchall-explicit/another/value.json`,
    initialRevalidateSeconds: 1,
    srcRoute: '/catchall-explicit/[...slug]',
  },
  '/catchall-explicit/first': {
    dataRoute: `/_next/data/${buildId}/catchall-explicit/first.json`,
    initialRevalidateSeconds: 1,
    srcRoute: '/catchall-explicit/[...slug]',
  },
  '/catchall-explicit/hello/another': {
    dataRoute: `/_next/data/${buildId}/catchall-explicit/hello/another.json`,
    initialRevalidateSeconds: 1,
    srcRoute: '/catchall-explicit/[...slug]',
  },
  '/catchall-explicit/second': {
    dataRoute: `/_next/data/${buildId}/catchall-explicit/second.json`,
    initialRevalidateSeconds: 1,
    srcRoute: '/catchall-explicit/[...slug]',
  },
  '/another': {
    dataRoute: `/_next/data/${buildId}/another.json`,
    initialRevalidateSeconds: 1,
    srcRoute: null,
  },
  '/blog': {
    dataRoute: `/_next/data/${buildId}/blog.json`,
    initialRevalidateSeconds: 10,
    srcRoute: null,
  },
  '/default-revalidate': {
    dataRoute: `/_next/data/${buildId}/default-revalidate.json`,
    initialRevalidateSeconds: false,
    srcRoute: null,
  },
  '/something': {
    dataRoute: `/_next/data/${buildId}/something.json`,
    initialRevalidateSeconds: false,
    srcRoute: null,
  },
  '/catchall/another/value': {
    dataRoute: `/_next/data/${buildId}/catchall/another/value.json`,
    initialRevalidateSeconds: 1,
    srcRoute: '/catchall/[...slug]',
  },
  '/catchall/first': {
    dataRoute: `/_next/data/${buildId}/catchall/first.json`,
    initialRevalidateSeconds: 1,
    srcRoute: '/catchall/[...slug]',
  },
  '/catchall/second': {
    dataRoute: `/_next/data/${buildId}/catchall/second.json`,
    initialRevalidateSeconds: 1,
    srcRoute: '/catchall/[...slug]',
  },
  '/catchall/hello/another': {
    dataRoute: `/_next/data/${buildId}/catchall/hello/another.json`,
    initialRevalidateSeconds: 1,
    srcRoute: '/catchall/[...slug]',
  },
})

const navigateTest = (dev = false) => {
  it('should navigate between pages successfully', async () => {
    const toBuild = [
      '/',
      '/another',
      '/something',
      '/normal',
      '/blog/post-1',
      '/blog/post-1/comment-1',
      '/catchall/first',
    ]

    await waitFor(2500)

    await Promise.all(toBuild.map(pg => renderViaHTTP(appPort, pg)))

    const browser = await webdriver(appPort, '/')
    let text = await browser.elementByCss('p').text()
    expect(text).toMatch(/hello.*?world/)

    // go to /another
    async function goFromHomeToAnother() {
      await browser.eval('window.beforeAnother = true')
      await browser.elementByCss('#another').click()
      await browser.waitForElementByCss('#home')
      text = await browser.elementByCss('p').text()
      expect(await browser.eval('window.beforeAnother')).toBe(true)
      expect(text).toMatch(/hello.*?world/)
    }
    await goFromHomeToAnother()

    // go to /
    async function goFromAnotherToHome() {
      await browser.eval('window.didTransition = 1')
      await browser.elementByCss('#home').click()
      await browser.waitForElementByCss('#another')
      text = await browser.elementByCss('p').text()
      expect(text).toMatch(/hello.*?world/)
      expect(await browser.eval('window.didTransition')).toBe(1)
    }
    await goFromAnotherToHome()

    // Client-side SSG data caching test
    // eslint-disable-next-line no-lone-blocks
    {
      // Let revalidation period lapse
      await waitFor(2000)

      // Trigger revalidation (visit page)
      await goFromHomeToAnother()
      const snapTime = await browser.elementByCss('#anotherTime').text()

      // Wait for revalidation to finish
      await waitFor(2000)

      // Re-visit page
      await goFromAnotherToHome()
      await goFromHomeToAnother()

      const nextTime = await browser.elementByCss('#anotherTime').text()
      if (dev) {
        expect(snapTime).not.toMatch(nextTime)
      } else {
        expect(snapTime).toMatch(nextTime)
      }

      // Reset to Home for next test
      await goFromAnotherToHome()
    }

    // go to /something
    await browser.elementByCss('#something').click()
    await browser.waitForElementByCss('#home')
    text = await browser.elementByCss('p').text()
    expect(text).toMatch(/hello.*?world/)
    expect(await browser.eval('window.didTransition')).toBe(1)

    // go to /
    await browser.elementByCss('#home').click()
    await browser.waitForElementByCss('#post-1')

    // go to /blog/post-1
    await browser.elementByCss('#post-1').click()
    await browser.waitForElementByCss('#home')
    text = await browser.elementByCss('p').text()
    expect(text).toMatch(/Post:.*?post-1/)
    expect(await browser.eval('window.didTransition')).toBe(1)

    // go to /
    await browser.elementByCss('#home').click()
    await browser.waitForElementByCss('#comment-1')

    // go to /blog/post-1/comment-1
    await browser.elementByCss('#comment-1').click()
    await browser.waitForElementByCss('#home')
    text = await browser.elementByCss('p:nth-child(2)').text()
    expect(text).toMatch(/Comment:.*?comment-1/)
    expect(await browser.eval('window.didTransition')).toBe(1)

    // go to /catchall/first
    await browser.elementByCss('#home').click()
    await browser.waitForElementByCss('#to-catchall')
    await browser.elementByCss('#to-catchall').click()
    await browser.waitForElementByCss('#catchall')
    text = await browser.elementByCss('#catchall').text()
    expect(text).toMatch(/Hi.*?first/)
    expect(await browser.eval('window.didTransition')).toBe(1)

    await browser.close()
  })
}

const runTests = (dev = false, looseMode = false) => {
  navigateTest(dev)

  it('should SSR normal page correctly', async () => {
    const html = await renderViaHTTP(appPort, '/')
    expect(html).toMatch(/hello.*?world/)
  })

  it('should SSR SPR page correctly', async () => {
    const html = await renderViaHTTP(appPort, '/blog/post-1')

    const $ = cheerio.load(html)
    expect(JSON.parse($('#__NEXT_DATA__').text()).isFallback).toBe(false)
    expect(html).toMatch(/Post:.*?post-1/)
  })

  it('should have gsp in __NEXT_DATA__', async () => {
    const html = await renderViaHTTP(appPort, '/')
    const $ = cheerio.load(html)
    expect(JSON.parse($('#__NEXT_DATA__').text()).gsp).toBe(true)
  })

  it('should not have gsp in __NEXT_DATA__ for non-GSP page', async () => {
    const html = await renderViaHTTP(appPort, '/normal')
    const $ = cheerio.load(html)
    expect('gsp' in JSON.parse($('#__NEXT_DATA__').text())).toBe(false)
  })

  it('should not supply query values to params or useRouter non-dynamic page SSR', async () => {
    const html = await renderViaHTTP(appPort, '/something?hello=world')
    const $ = cheerio.load(html)
    const query = $('#query').text()
    expect(JSON.parse(query)).toEqual({})
    const params = $('#params').text()
    expect(JSON.parse(params)).toEqual({})
  })

  it('should not supply query values to params in /_next/data request', async () => {
    const data = JSON.parse(
      await renderViaHTTP(
        appPort,
        `/_next/data/${buildId}/something.json?hello=world`
      )
    )
    expect(data.pageProps.params).toEqual({})
  })

  it('should not supply query values to params or useRouter dynamic page SSR', async () => {
    const html = await renderViaHTTP(appPort, '/blog/post-1?hello=world')
    const $ = cheerio.load(html)

    const params = $('#params').text()
    expect(JSON.parse(params)).toEqual({ post: 'post-1' })

    const query = $('#query').text()
    expect(JSON.parse(query)).toEqual({ post: 'post-1' })
  })

  it('should return data correctly', async () => {
    const data = JSON.parse(
      await renderViaHTTP(
        appPort,
        expectedManifestRoutes()['/something'].dataRoute
      )
    )
    expect(data.pageProps.world).toBe('world')
  })

  it('should return data correctly for dynamic page', async () => {
    const data = JSON.parse(
      await renderViaHTTP(
        appPort,
        expectedManifestRoutes()['/blog/post-1'].dataRoute
      )
    )
    expect(data.pageProps.post).toBe('post-1')
  })

  it('should return data correctly for dynamic page (non-seeded)', async () => {
    const data = JSON.parse(
      await renderViaHTTP(
        appPort,
        expectedManifestRoutes()['/blog/post-1'].dataRoute.replace(
          /post-1/,
          'post-3'
        )
      )
    )
    expect(data.pageProps.post).toBe('post-3')
  })

  it('should navigate to a normal page and back', async () => {
    const browser = await webdriver(appPort, '/')
    let text = await browser.elementByCss('p').text()
    expect(text).toMatch(/hello.*?world/)

    await browser.elementByCss('#normal').click()
    await browser.waitForElementByCss('#normal-text')
    text = await browser.elementByCss('#normal-text').text()
    expect(text).toMatch(/a normal page/)
  })

  it('should parse query values on mount correctly', async () => {
    const browser = await webdriver(appPort, '/blog/post-1?another=value')
    const text = await browser.elementByCss('#query').text()
    expect(text).toMatch(/another.*?value/)
    expect(text).toMatch(/post.*?post-1/)
  })

  it('should reload page on failed data request', async () => {
    const browser = await webdriver(appPort, '/')
    await browser.eval('window.beforeClick = "abc"')
    await browser.elementByCss('#broken-post').click()
    await waitFor(1000)
    expect(await browser.eval('window.beforeClick')).not.toBe('abc')
  })

  // TODO: dev currently renders this page as blocking, meaning it shows the
  // server error instead of continously retrying. Do we want to change this?
  if (!dev) {
    it('should reload page on failed data request, and retry', async () => {
      const browser = await webdriver(appPort, '/')
      await browser.eval('window.beforeClick = "abc"')
      await browser.elementByCss('#broken-at-first-post').click()
      await waitFor(3000)
      expect(await browser.eval('window.beforeClick')).not.toBe('abc')

      const text = await browser.elementByCss('#params').text()
      expect(text).toMatch(/post.*?post-999/)
    })
  }

  it('should support prerendered catchall route', async () => {
    const html = await renderViaHTTP(appPort, '/catchall/another/value')
    const $ = cheerio.load(html)

    expect(
      JSON.parse(
        cheerio
          .load(html)('#__NEXT_DATA__')
          .text()
      ).isFallback
    ).toBe(false)
    expect($('#catchall').text()).toMatch(/Hi.*?another value/)
  })

  it('should support lazy catchall route', async () => {
    const html = await renderViaHTTP(appPort, '/catchall/notreturnedinpaths')
    const $ = cheerio.load(html)
    expect($('#catchall').text()).toBe('fallback')

    // hydration
    const browser = await webdriver(appPort, '/catchall/delayby3s')

    const text1 = await browser.elementByCss('#catchall').text()
    expect(text1).toBe('fallback')

    await check(
      () => browser.elementByCss('#catchall').text(),
      /Hi.*?delayby3s/
    )
  })

  it('should support nested lazy catchall route', async () => {
    // We will render fallback for a "lazy" route
    const html = await renderViaHTTP(
      appPort,
      '/catchall/notreturnedinpaths/nested'
    )
    const $ = cheerio.load(html)
    expect($('#catchall').text()).toBe('fallback')

    // hydration
    const browser = await webdriver(appPort, '/catchall/delayby3s/nested')

    const text1 = await browser.elementByCss('#catchall').text()
    expect(text1).toBe('fallback')

    await check(
      () => browser.elementByCss('#catchall').text(),
      /Hi.*?delayby3s nested/
    )
  })

  it('should support prerendered catchall-explicit route (nested)', async () => {
    const html = await renderViaHTTP(
      appPort,
      '/catchall-explicit/another/value'
    )
    const $ = cheerio.load(html)

    expect(
      JSON.parse(
        cheerio
          .load(html)('#__NEXT_DATA__')
          .text()
      ).isFallback
    ).toBe(false)
    expect($('#catchall').text()).toMatch(/Hi.*?another value/)
  })

  it('should support prerendered catchall-explicit route (single)', async () => {
    const html = await renderViaHTTP(appPort, '/catchall-explicit/second')
    const $ = cheerio.load(html)

    expect(
      JSON.parse(
        cheerio
          .load(html)('#__NEXT_DATA__')
          .text()
      ).isFallback
    ).toBe(false)
    expect($('#catchall').text()).toMatch(/Hi.*?second/)
  })

  if (!looseMode) {
    it('should 404 for a missing catchall explicit route', async () => {
      const res = await fetchViaHTTP(
        appPort,
        '/catchall-explicit/notreturnedinpaths'
      )
      expect(res.status).toBe(404)
      const html = await res.text()
      expect(html).toMatch(/This page could not be found/)
    })
  }

  if (dev) {
    // TODO: re-enable when this is supported in dev
    // it('should show error when rewriting to dynamic SSG page', async () => {
    //   const item = Math.round(Math.random() * 100)
    //   const html = await renderViaHTTP(appPort, `/some-rewrite/${item}`)
    //   expect(html).toContain(
    //     `Rewrites don't support dynamic pages with getStaticProps yet. Using this will cause the page to fail to parse the params on the client for the fallback page`
    //   )
    // })

    it('should not show warning from url prop being returned', async () => {
      const urlPropPage = join(appDir, 'pages/url-prop.js')
      await fs.writeFile(
        urlPropPage,
        `
        export async function getStaticProps() {
          return {
            props: {
              url: 'something'
            }
          }
        }

        export default ({ url }) => <p>url: {url}</p>
      `
      )

      const html = await renderViaHTTP(appPort, '/url-prop')
      await fs.remove(urlPropPage)
      expect(stderr).not.toMatch(
        /The prop `url` is a reserved prop in Next.js for legacy reasons and will be overridden on page \/url-prop/
      )
      expect(html).toMatch(/url:.*?something/)
    })

    it('should always show fallback for page not in getStaticPaths', async () => {
      const html = await renderViaHTTP(appPort, '/blog/post-321')
      const $ = cheerio.load(html)
      expect(JSON.parse($('#__NEXT_DATA__').text()).isFallback).toBe(true)

      // make another request to ensure it still is
      const html2 = await renderViaHTTP(appPort, '/blog/post-321')
      const $2 = cheerio.load(html2)
      expect(JSON.parse($2('#__NEXT_DATA__').text()).isFallback).toBe(true)
    })

    it('should not show fallback for page in getStaticPaths', async () => {
      const html = await renderViaHTTP(appPort, '/blog/post-1')
      const $ = cheerio.load(html)
      expect(JSON.parse($('#__NEXT_DATA__').text()).isFallback).toBe(false)

      // make another request to ensure it's still not
      const html2 = await renderViaHTTP(appPort, '/blog/post-1')
      const $2 = cheerio.load(html2)
      expect(JSON.parse($2('#__NEXT_DATA__').text()).isFallback).toBe(false)
    })

    it('should log error in console and browser in dev mode', async () => {
      const origContent = await fs.readFile(indexPage, 'utf8')

      const browser = await webdriver(appPort, '/')
      expect(await browser.elementByCss('p').text()).toMatch(/hello.*?world/)

      await fs.writeFile(
        indexPage,
        origContent
          .replace('// throw new', 'throw new')
          .replace('{/* <div', '<div')
          .replace('</div> */}', '</div>')
      )
      await browser.waitForElementByCss('#after-change')
      // we need to reload the page to trigger getStaticProps
      await browser.refresh()

      const errOverlayContent = await getReactErrorOverlayContent(browser)

      await fs.writeFile(indexPage, origContent)
      const errorMsg = /oops from getStaticProps/
      expect(stderr).toMatch(errorMsg)
      expect(errOverlayContent).toMatch(errorMsg)
    })

    it('should always call getStaticProps without caching in dev', async () => {
      const initialRes = await fetchViaHTTP(appPort, '/something')
      expect(initialRes.headers.get('cache-control')).toBeFalsy()
      const initialHtml = await initialRes.text()
      expect(initialHtml).toMatch(/hello.*?world/)

      const newRes = await fetchViaHTTP(appPort, '/something')
      expect(newRes.headers.get('cache-control')).toBeFalsy()
      const newHtml = await newRes.text()
      expect(newHtml).toMatch(/hello.*?world/)
      expect(initialHtml !== newHtml).toBe(true)

      const newerRes = await fetchViaHTTP(appPort, '/something')
      expect(newerRes.headers.get('cache-control')).toBeFalsy()
      const newerHtml = await newerRes.text()
      expect(newerHtml).toMatch(/hello.*?world/)
      expect(newHtml !== newerHtml).toBe(true)
    })

    it('should error on bad object from getStaticProps', async () => {
      const origContent = await fs.readFile(indexPage, 'utf8')
      await fs.writeFile(
        indexPage,
        origContent.replace(/\/\/ bad-prop/, 'another: true,')
      )
      await waitFor(1000)
      try {
        const html = await renderViaHTTP(appPort, '/')
        expect(html).toMatch(/Additional keys were returned/)
      } finally {
        await fs.writeFile(indexPage, origContent)
      }
    })

    it('should error on dynamic page without getStaticPaths', async () => {
      const curPage = join(__dirname, '../pages/temp/[slug].js')
      await fs.mkdirp(dirname(curPage))
      await fs.writeFile(
        curPage,
        `
          export async function getStaticProps() {
            return {
              props: {
                hello: 'world'
              }
            }
          }
          export default () => 'oops'
        `
      )
      await waitFor(1000)
      try {
        const html = await renderViaHTTP(appPort, '/temp/hello')
        expect(html).toMatch(
          /getStaticPaths is required for dynamic SSG pages and is missing for/
        )
      } finally {
        await fs.remove(curPage)
      }
    })

    it('should error on dynamic page without getStaticPaths returning fallback property', async () => {
      const curPage = join(__dirname, '../pages/temp2/[slug].js')
      await fs.mkdirp(dirname(curPage))
      await fs.writeFile(
        curPage,
        `
          export async function getStaticPaths() {
            return {
              paths: []
            }
          }
          export async function getStaticProps() {
            return {
              props: {
                hello: 'world'
              }
            }
          }
          export default () => 'oops'
        `
      )
      await waitFor(1000)
      try {
        const html = await renderViaHTTP(appPort, '/temp2/hello')
        expect(html).toMatch(/`fallback` key must be returned from/)
      } finally {
        await fs.remove(curPage)
      }
    })

    it('should not re-call getStaticProps when updating query', async () => {
      const browser = await webdriver(appPort, '/something?hello=world')
      await waitFor(2000)

      const query = await browser.elementByCss('#query').text()
      expect(JSON.parse(query)).toEqual({ hello: 'world' })

      const {
        props: {
          pageProps: { random: initialRandom },
        },
      } = await browser.eval('window.__NEXT_DATA__')

      const curRandom = await browser.elementByCss('#random').text()
      expect(curRandom).toBe(initialRandom + '')
    })
  } else {
    if (!looseMode) {
      it('should should use correct caching headers for a no-revalidate page', async () => {
        const initialRes = await fetchViaHTTP(appPort, '/something')
        expect(initialRes.headers.get('cache-control')).toBe(
          's-maxage=31536000, stale-while-revalidate'
        )
        const initialHtml = await initialRes.text()
        expect(initialHtml).toMatch(/hello.*?world/)
      })
    }

    it('outputs dataRoutes in routes-manifest correctly', async () => {
      const { dataRoutes } = JSON.parse(
        await fs.readFile(join(appDir, '.next/routes-manifest.json'), 'utf8')
      )

      for (const route of dataRoutes) {
        route.dataRouteRegex = normalizeRegEx(route.dataRouteRegex)
      }

      expect(dataRoutes).toEqual([
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(buildId)}\\/index.json$`
          ),
          page: '/',
        },
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(buildId)}\\/another.json$`
          ),
          page: '/another',
        },
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(buildId)}\\/blog.json$`
          ),
          page: '/blog',
        },
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(
              buildId
            )}\\/blog\\/([^\\/]+?)\\.json$`
          ),
          page: '/blog/[post]',
        },
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(
              buildId
            )}\\/blog\\/([^\\/]+?)\\/([^\\/]+?)\\.json$`
          ),
          page: '/blog/[post]/[comment]',
        },
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(
              buildId
            )}\\/catchall\\/(.+?)\\.json$`
          ),
          page: '/catchall/[...slug]',
        },
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(
              buildId
            )}\\/catchall\\-explicit\\/(.+?)\\.json$`
          ),
          page: '/catchall-explicit/[...slug]',
        },
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(
              buildId
            )}\\/default-revalidate.json$`
          ),
          page: '/default-revalidate',
        },
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(buildId)}\\/something.json$`
          ),
          page: '/something',
        },
        {
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapeRegex(
              buildId
            )}\\/user\\/([^\\/]+?)\\/profile\\.json$`
          ),
          page: '/user/[user]/profile',
        },
      ])
    })

    it('outputs a prerender-manifest correctly', async () => {
      const manifest = JSON.parse(
        await fs.readFile(join(appDir, '.next/prerender-manifest.json'), 'utf8')
      )
      const escapedBuildId = escapeRegex(buildId)

      Object.keys(manifest.dynamicRoutes).forEach(key => {
        const item = manifest.dynamicRoutes[key]

        if (item.dataRouteRegex) {
          item.dataRouteRegex = normalizeRegEx(item.dataRouteRegex)
        }
        if (item.routeRegex) {
          item.routeRegex = normalizeRegEx(item.routeRegex)
        }
      })

      expect(manifest.version).toBe(2)
      expect(manifest.routes).toEqual(expectedManifestRoutes())
      expect(manifest.dynamicRoutes).toEqual({
        '/blog/[post]': {
          fallback: '/blog/[post].html',
          dataRoute: `/_next/data/${buildId}/blog/[post].json`,
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapedBuildId}\\/blog\\/([^\\/]+?)\\.json$`
          ),
          routeRegex: normalizeRegEx('^\\/blog\\/([^\\/]+?)(?:\\/)?$'),
        },
        '/blog/[post]/[comment]': {
          fallback: '/blog/[post]/[comment].html',
          dataRoute: `/_next/data/${buildId}/blog/[post]/[comment].json`,
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapedBuildId}\\/blog\\/([^\\/]+?)\\/([^\\/]+?)\\.json$`
          ),
          routeRegex: normalizeRegEx(
            '^\\/blog\\/([^\\/]+?)\\/([^\\/]+?)(?:\\/)?$'
          ),
        },
        '/user/[user]/profile': {
          fallback: '/user/[user]/profile.html',
          dataRoute: `/_next/data/${buildId}/user/[user]/profile.json`,
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapedBuildId}\\/user\\/([^\\/]+?)\\/profile\\.json$`
          ),
          routeRegex: normalizeRegEx(
            `^\\/user\\/([^\\/]+?)\\/profile(?:\\/)?$`
          ),
        },
        '/catchall/[...slug]': {
          fallback: '/catchall/[...slug].html',
          routeRegex: normalizeRegEx('^\\/catchall\\/(.+?)(?:\\/)?$'),
          dataRoute: `/_next/data/${buildId}/catchall/[...slug].json`,
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapedBuildId}\\/catchall\\/(.+?)\\.json$`
          ),
        },
        '/catchall-explicit/[...slug]': {
          dataRoute: `/_next/data/${buildId}/catchall-explicit/[...slug].json`,
          dataRouteRegex: normalizeRegEx(
            `^\\/_next\\/data\\/${escapedBuildId}\\/catchall\\-explicit\\/(.+?)\\.json$`
          ),
          fallback: false,
          routeRegex: normalizeRegEx(
            '^\\/catchall\\-explicit\\/(.+?)(?:\\/)?$'
          ),
        },
      })
    })

    it('outputs prerendered files correctly', async () => {
      const routes = [
        '/another',
        '/something',
        '/blog/post-1',
        '/blog/post-2/comment-2',
      ]

      for (const route of routes) {
        await fs.access(join(distPagesDir, `${route}.html`), fs.constants.F_OK)
        await fs.access(join(distPagesDir, `${route}.json`), fs.constants.F_OK)
      }
    })

    if (!looseMode) {
      it('should handle de-duping correctly', async () => {
        let vals = new Array(10).fill(null)

        // use data route so we don't get the fallback
        vals = await Promise.all(
          vals.map(() =>
            renderViaHTTP(appPort, `/_next/data/${buildId}/blog/post-10.json`)
          )
        )
        const val = vals[0]

        expect(JSON.parse(val).pageProps.post).toBe('post-10')
        expect(new Set(vals).size).toBe(1)
      })
    }

    it('should not revalidate when set to false', async () => {
      const route = '/something'
      const initialHtml = await renderViaHTTP(appPort, route)
      let newHtml = await renderViaHTTP(appPort, route)
      expect(initialHtml).toBe(newHtml)

      newHtml = await renderViaHTTP(appPort, route)
      expect(initialHtml).toBe(newHtml)

      newHtml = await renderViaHTTP(appPort, route)
      expect(initialHtml).toBe(newHtml)
    })

    if (!looseMode) {
      it('should handle revalidating HTML correctly', async () => {
        const route = '/blog/post-2/comment-2'
        const initialHtml = await renderViaHTTP(appPort, route)
        expect(initialHtml).toMatch(/Post:.*?post-2/)
        expect(initialHtml).toMatch(/Comment:.*?comment-2/)

        let newHtml = await renderViaHTTP(appPort, route)
        expect(newHtml).toBe(initialHtml)

        await waitFor(2 * 1000)
        await renderViaHTTP(appPort, route)

        await waitFor(2 * 1000)
        newHtml = await renderViaHTTP(appPort, route)
        expect(newHtml === initialHtml).toBe(false)
        expect(newHtml).toMatch(/Post:.*?post-2/)
        expect(newHtml).toMatch(/Comment:.*?comment-2/)
      })

      it('should handle revalidating JSON correctly', async () => {
        const route = `/_next/data/${buildId}/blog/post-2/comment-3.json`
        const initialJson = await renderViaHTTP(appPort, route)
        expect(initialJson).toMatch(/post-2/)
        expect(initialJson).toMatch(/comment-3/)

        let newJson = await renderViaHTTP(appPort, route)
        expect(newJson).toBe(initialJson)

        await waitFor(2 * 1000)
        await renderViaHTTP(appPort, route)

        await waitFor(2 * 1000)
        newJson = await renderViaHTTP(appPort, route)
        expect(newJson === initialJson).toBe(false)
        expect(newJson).toMatch(/post-2/)
        expect(newJson).toMatch(/comment-3/)
      })
    }

    it('should not fetch prerender data on mount', async () => {
      const browser = await webdriver(appPort, '/blog/post-100')
      await browser.eval('window.thisShouldStay = true')
      await waitFor(2 * 1000)
      const val = await browser.eval('window.thisShouldStay')
      expect(val).toBe(true)
    })

    it('should not error when flushing cache files', async () => {
      await fetchViaHTTP(appPort, '/user/user-1/profile')
      await waitFor(500)
      expect(stderr).not.toMatch(/Failed to update prerender files for/)
    })
  }
}

describe('SSG Prerender', () => {
  afterAll(() => fs.remove(nextConfig))

  describe('dev mode', () => {
    beforeAll(async () => {
      await fs.writeFile(
        nextConfig,
        `
        module.exports = {
          experimental: {
            rewrites() {
              return [
                {
                  source: "/some-rewrite/:item",
                  destination: "/blog/post-:item"
                }
              ]
            }
          }
        }
      `
      )
      appPort = await findPort()
      app = await launchApp(appDir, appPort, {
        onStderr: msg => {
          stderr += msg
        },
      })
      buildId = 'development'
    })
    afterAll(() => killApp(app))

    runTests(true)
  })

  describe('dev mode getStaticPaths', () => {
    beforeAll(async () => {
      await fs.writeFile(
        nextConfig,
        // we set cpus to 1 so that we make sure the requests
        // aren't being cached at the jest-worker level
        `module.exports = { experimental: { cpus: 1 } }`,
        'utf8'
      )
      await fs.remove(join(appDir, '.next'))
      appPort = await findPort()
      app = await launchApp(appDir, appPort)
    })
    afterAll(async () => {
      await fs.remove(nextConfig)
      await killApp(app)
    })

    it('should not cache getStaticPaths errors', async () => {
      const errMsg = /The `fallback` key must be returned from getStaticPaths/
      await check(() => renderViaHTTP(appPort, '/blog/post-1'), /post-1/)

      const blogPage = join(appDir, 'pages/blog/[post]/index.js')
      const origContent = await fs.readFile(blogPage, 'utf8')
      await fs.writeFile(
        blogPage,
        origContent.replace('fallback: true,', '/* fallback: true, */')
      )

      try {
        await check(() => renderViaHTTP(appPort, '/blog/post-1'), errMsg)

        await fs.writeFile(blogPage, origContent)
        await check(() => renderViaHTTP(appPort, '/blog/post-1'), /post-1/)
      } finally {
        await fs.writeFile(blogPage, origContent)
      }
    })
  })

  describe('serverless mode', () => {
    beforeAll(async () => {
      await fs.writeFile(
        nextConfig,
        `module.exports = { target: 'serverless' }`,
        'utf8'
      )
      await fs.remove(join(appDir, '.next'))
      await nextBuild(appDir)
      stderr = ''
      appPort = await findPort()
      app = await nextStart(appDir, appPort, {
        onStderr: msg => {
          stderr += msg
        },
      })
      distPagesDir = join(appDir, '.next/serverless/pages')
      buildId = await fs.readFile(join(appDir, '.next/BUILD_ID'), 'utf8')
    })
    afterAll(() => killApp(app))

    it('renders data correctly', async () => {
      const port = await findPort()
      const server = await startServer({
        BUILD_ID: buildId,
        PORT: port,
      })
      const data = await renderViaHTTP(
        port,
        `/_next/data/${buildId}/index.json`
      )
      await killApp(server)
      expect(JSON.parse(data).pageProps.world).toBe('world')
    })

    runTests()

    it('should not show invalid error', async () => {
      const brokenPage = join(appDir, 'pages/broken.js')
      await fs.writeFile(
        brokenPage,
        `
        export async function getStaticProps() {
          return {
            hello: 'world'
          }
        }
        export default () => 'hello world'
      `
      )
      await fs.remove(join(appDir, '.next'))
      const { stderr } = await nextBuild(appDir, [], { stderr: true })
      await fs.remove(brokenPage)
      expect(stderr).toContain(
        'Additional keys were returned from `getStaticProps`'
      )
      expect(stderr).not.toContain(
        'You can not use getInitialProps with getStaticProps'
      )
    })
  })

  describe('enumlated serverless mode', () => {
    beforeAll(async () => {
      const startServerlessEmulator = async (dir, port, buildId) => {
        const scriptPath = join(dir, 'server.js')
        const env = Object.assign(
          {},
          { ...process.env },
          { PORT: port, BUILD_ID: buildId }
        )
        return initNextServerScript(scriptPath, /ready on/i, env)
      }

      await fs.writeFile(
        nextConfig,
        `module.exports = { target: 'experimental-serverless-trace' }`,
        'utf8'
      )
      await fs.remove(join(appDir, '.next'))
      await nextBuild(appDir)

      distPagesDir = join(appDir, '.next/serverless/pages')
      buildId = await fs.readFile(join(appDir, '.next/BUILD_ID'), 'utf8')

      stderr = ''
      appPort = await findPort()
      app = await startServerlessEmulator(appDir, appPort, buildId)
    })
    afterAll(() => killApp(app))

    runTests(false, true)
  })

  describe('production mode', () => {
    let buildOutput = ''
    beforeAll(async () => {
      await fs.remove(nextConfig)
      await fs.remove(join(appDir, '.next'))
      const { stdout } = await nextBuild(appDir, [], { stdout: true })
      buildOutput = stdout

      stderr = ''
      appPort = await findPort()
      app = await nextStart(appDir, appPort, {
        onStderr: msg => {
          stderr += msg
        },
      })
      buildId = await fs.readFile(join(appDir, '.next/BUILD_ID'), 'utf8')
      distPagesDir = join(appDir, '.next/server/static', buildId, 'pages')
    })
    afterAll(() => killApp(app))

    it('should of formatted build output correctly', () => {
      expect(buildOutput).toMatch(/○ \/normal/)
      expect(buildOutput).toMatch(/● \/blog\/\[post\]/)
      expect(buildOutput).toMatch(/\+2 more paths/)
    })

    runTests()
  })

  describe('export mode', () => {
    beforeAll(async () => {
      exportDir = join(appDir, 'out')
      await fs.writeFile(
        nextConfig,
        `module.exports = {
          exportTrailingSlash: true,
          exportPathMap: function(defaultPathMap) {
            if (defaultPathMap['/blog/[post]']) {
              throw new Error('Found SPR page in the default export path map')
            }
            return defaultPathMap
          },
        }`
      )
      await fs.remove(join(appDir, '.next'))
      await nextBuild(appDir)
      await nextExport(appDir, { outdir: exportDir })
      app = await startStaticServer(exportDir)
      appPort = app.address().port
      buildId = await fs.readFile(join(appDir, '.next/BUILD_ID'), 'utf8')
    })
    afterAll(async () => {
      await stopApp(app)
      await fs.remove(nextConfig)
    })

    it('should copy prerender files and honor exportTrailingSlash', async () => {
      const routes = [
        '/another',
        '/something',
        '/blog/post-1',
        '/blog/post-2/comment-2',
      ]

      for (const route of routes) {
        await fs.access(join(exportDir, `${route}/index.html`))
        await fs.access(join(exportDir, '_next/data', buildId, `${route}.json`))
      }
    })

    navigateTest()
  })
})
