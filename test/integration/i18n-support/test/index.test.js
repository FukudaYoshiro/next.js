/* eslint-env jest */

import url from 'url'
import fs from 'fs-extra'
import cheerio from 'cheerio'
import { join } from 'path'
import webdriver from 'next-webdriver'
import {
  fetchViaHTTP,
  findPort,
  killApp,
  launchApp,
  nextBuild,
  nextStart,
  renderViaHTTP,
  File,
} from 'next-test-utils'

jest.setTimeout(1000 * 60 * 2)

const appDir = join(__dirname, '../')
const nextConfig = new File(join(appDir, 'next.config.js'))
let app
let appPort
// let buildId

const locales = ['en-US', 'nl-NL', 'nl-BE', 'nl', 'en']

function runTests() {
  it('should generate fallbacks with all locales', async () => {
    for (const locale of locales) {
      const html = await renderViaHTTP(
        appPort,
        `/${locale}/gsp/fallback/${Math.random()}`
      )
      const $ = cheerio.load(html)
      expect($('html').attr('lang')).toBe(locale)
    }
  })

  it('should generate auto-export page with all locales', async () => {
    for (const locale of locales) {
      const html = await renderViaHTTP(appPort, `/${locale}`)
      const $ = cheerio.load(html)
      expect($('html').attr('lang')).toBe(locale)
      expect($('#router-locale').text()).toBe(locale)
      expect($('#router-as-path').text()).toBe('/')
      expect($('#router-pathname').text()).toBe('/')
      expect(JSON.parse($('#router-locales').text())).toEqual(locales)

      const html2 = await renderViaHTTP(appPort, `/${locale}/auto-export`)
      const $2 = cheerio.load(html2)
      expect($2('html').attr('lang')).toBe(locale)
      expect($2('#router-locale').text()).toBe(locale)
      expect($2('#router-as-path').text()).toBe('/auto-export')
      expect($2('#router-pathname').text()).toBe('/auto-export')
      expect(JSON.parse($2('#router-locales').text())).toEqual(locales)
    }
  })

  it('should generate non-dynamic SSG page with all locales', async () => {
    for (const locale of locales) {
      const html = await renderViaHTTP(appPort, `/${locale}/gsp`)
      const $ = cheerio.load(html)
      expect($('html').attr('lang')).toBe(locale)
      expect($('#router-locale').text()).toBe(locale)
      expect($('#router-as-path').text()).toBe('/gsp')
      expect($('#router-pathname').text()).toBe('/gsp')
      expect(JSON.parse($('#router-locales').text())).toEqual(locales)
    }
  })

  // TODO: SSG 404 behavior to opt-out of generating specific locale
  // for non-dynamic SSG pages

  it('should remove un-necessary locale prefix for default locale', async () => {
    const res = await fetchViaHTTP(appPort, '/en-US', undefined, {
      redirect: 'manual',
      headers: {
        'Accept-Language': 'en-US;q=0.9',
      },
    })

    expect(res.status).toBe(307)

    const parsedUrl = url.parse(res.headers.get('location'), true)

    expect(parsedUrl.pathname).toBe('/')
    expect(parsedUrl.query).toEqual({})
  })

  it('should load getStaticProps page correctly SSR (default locale no prefix)', async () => {
    const html = await renderViaHTTP(appPort, '/gsp')
    const $ = cheerio.load(html)

    expect(JSON.parse($('#props').text())).toEqual({
      locale: 'en-US',
      locales,
    })
    expect($('#router-locale').text()).toBe('en-US')
    expect(JSON.parse($('#router-locales').text())).toEqual(locales)
    expect($('html').attr('lang')).toBe('en-US')
  })

  it('should load getStaticProps fallback prerender page correctly SSR (default locale no prefix)', async () => {
    const html = await renderViaHTTP(appPort, '/gsp/fallback/first')
    const $ = cheerio.load(html)

    expect(JSON.parse($('#props').text())).toEqual({
      locale: 'en-US',
      locales,
      params: {
        slug: 'first',
      },
    })
    expect(JSON.parse($('#router-query').text())).toEqual({
      slug: 'first',
    })
    expect($('#router-locale').text()).toBe('en-US')
    expect(JSON.parse($('#router-locales').text())).toEqual(locales)
    expect($('html').attr('lang')).toBe('en-US')
  })

  it('should load getStaticProps fallback non-prerender page correctly (default locale no prefix', async () => {
    const browser = await webdriver(appPort, '/gsp/fallback/another')

    await browser.waitForElementByCss('#props')

    expect(JSON.parse(await browser.elementByCss('#props').text())).toEqual({
      locale: 'en-US',
      locales,
      params: {
        slug: 'another',
      },
    })
    expect(
      JSON.parse(await browser.elementByCss('#router-query').text())
    ).toEqual({
      slug: 'another',
    })
    expect(await browser.elementByCss('#router-locale').text()).toBe('en-US')
    expect(
      JSON.parse(await browser.elementByCss('#router-locales').text())
    ).toEqual(locales)
  })

  it('should redirect to locale prefixed route for /', async () => {
    const res = await fetchViaHTTP(appPort, '/', undefined, {
      redirect: 'manual',
      headers: {
        'Accept-Language': 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })
    expect(res.status).toBe(307)

    const parsedUrl = url.parse(res.headers.get('location'), true)
    expect(parsedUrl.pathname).toBe('/nl-NL')
    expect(parsedUrl.query).toEqual({})

    const res2 = await fetchViaHTTP(
      appPort,
      '/',
      { hello: 'world' },
      {
        redirect: 'manual',
        headers: {
          'Accept-Language': 'en;q=0.9',
        },
      }
    )
    expect(res2.status).toBe(307)

    const parsedUrl2 = url.parse(res2.headers.get('location'), true)
    expect(parsedUrl2.pathname).toBe('/en')
    expect(parsedUrl2.query).toEqual({ hello: 'world' })
  })

  it('should redirect to default locale route for / without accept-language', async () => {
    const res = await fetchViaHTTP(appPort, '/', undefined, {
      redirect: 'manual',
    })
    expect(res.status).toBe(307)

    const parsedUrl = url.parse(res.headers.get('location'), true)
    expect(parsedUrl.pathname).toBe('/en-US')
    expect(parsedUrl.query).toEqual({})

    const res2 = await fetchViaHTTP(
      appPort,
      '/',
      { hello: 'world' },
      {
        redirect: 'manual',
      }
    )
    expect(res2.status).toBe(307)

    const parsedUrl2 = url.parse(res2.headers.get('location'), true)
    expect(parsedUrl2.pathname).toBe('/en-US')
    expect(parsedUrl2.query).toEqual({ hello: 'world' })
  })

  it('should load getStaticProps page correctly SSR', async () => {
    const html = await renderViaHTTP(appPort, '/en-US/gsp')
    const $ = cheerio.load(html)

    expect(JSON.parse($('#props').text())).toEqual({
      locale: 'en-US',
      locales,
    })
    expect($('#router-locale').text()).toBe('en-US')
    expect(JSON.parse($('#router-locales').text())).toEqual(locales)
    expect($('html').attr('lang')).toBe('en-US')
  })

  it('should load getStaticProps fallback prerender page correctly SSR', async () => {
    const html = await renderViaHTTP(appPort, '/en-US/gsp/fallback/first')
    const $ = cheerio.load(html)

    expect(JSON.parse($('#props').text())).toEqual({
      locale: 'en-US',
      locales,
      params: {
        slug: 'first',
      },
    })
    expect(JSON.parse($('#router-query').text())).toEqual({
      slug: 'first',
    })
    expect($('#router-locale').text()).toBe('en-US')
    expect(JSON.parse($('#router-locales').text())).toEqual(locales)
    expect($('html').attr('lang')).toBe('en-US')
  })

  it('should load getStaticProps fallback non-prerender page correctly', async () => {
    const browser = await webdriver(appPort, '/en/gsp/fallback/another')

    await browser.waitForElementByCss('#props')

    expect(JSON.parse(await browser.elementByCss('#props').text())).toEqual({
      locale: 'en',
      locales,
      params: {
        slug: 'another',
      },
    })
    expect(
      JSON.parse(await browser.elementByCss('#router-query').text())
    ).toEqual({
      slug: 'another',
    })
    expect(await browser.elementByCss('#router-locale').text()).toBe('en')
    expect(
      JSON.parse(await browser.elementByCss('#router-locales').text())
    ).toEqual(locales)

    expect(await browser.elementByCss('html').getAttribute('lang')).toBe('en')
  })

  it('should load getServerSideProps page correctly SSR (default locale no prefix)', async () => {
    const html = await renderViaHTTP(appPort, '/gssp')
    const $ = cheerio.load(html)

    expect(JSON.parse($('#props').text())).toEqual({
      locale: 'en-US',
      locales,
    })
    expect($('#router-locale').text()).toBe('en-US')
    expect(JSON.parse($('#router-locales').text())).toEqual(locales)
    expect(JSON.parse($('#router-query').text())).toEqual({})
    expect($('html').attr('lang')).toBe('en-US')
  })

  it('should navigate client side for default locale with no prefix', async () => {
    const browser = await webdriver(appPort, '/')
    // make sure default locale is used in case browser isn't set to
    // favor en-US by default
    await browser.manage().addCookie({ name: 'NEXT_LOCALE', value: 'en-US' })
    await browser.get(browser.initUrl)

    const checkIndexValues = async () => {
      expect(await browser.elementByCss('#router-locale').text()).toBe('en-US')
      expect(
        JSON.parse(await browser.elementByCss('#router-locales').text())
      ).toEqual(locales)
      expect(
        JSON.parse(await browser.elementByCss('#router-query').text())
      ).toEqual({})
      expect(await browser.elementByCss('#router-pathname').text()).toBe('/')
      expect(await browser.elementByCss('#router-as-path').text()).toBe('/')
      expect(
        url.parse(await browser.eval(() => window.location.href)).pathname
      ).toBe('/')
    }

    await checkIndexValues()

    await browser.elementByCss('#to-another').click()
    await browser.waitForElementByCss('#another')

    expect(JSON.parse(await browser.elementByCss('#props').text())).toEqual({
      locale: 'en-US',
      locales,
    })
    expect(await browser.elementByCss('#router-locale').text()).toBe('en-US')
    expect(
      JSON.parse(await browser.elementByCss('#router-locales').text())
    ).toEqual(locales)
    expect(
      JSON.parse(await browser.elementByCss('#router-query').text())
    ).toEqual({})
    expect(await browser.elementByCss('#router-pathname').text()).toBe(
      '/another'
    )
    expect(await browser.elementByCss('#router-as-path').text()).toBe(
      '/another'
    )
    expect(
      url.parse(await browser.eval(() => window.location.href)).pathname
    ).toBe('/another')

    await browser.elementByCss('#to-index').click()
    await browser.waitForElementByCss('#index')

    await checkIndexValues()

    await browser.elementByCss('#to-gsp').click()
    await browser.waitForElementByCss('#gsp')

    expect(JSON.parse(await browser.elementByCss('#props').text())).toEqual({
      locale: 'en-US',
      locales,
    })
    expect(await browser.elementByCss('#router-locale').text()).toBe('en-US')
    expect(
      JSON.parse(await browser.elementByCss('#router-locales').text())
    ).toEqual(locales)
    expect(
      JSON.parse(await browser.elementByCss('#router-query').text())
    ).toEqual({})
    expect(await browser.elementByCss('#router-pathname').text()).toBe('/gsp')
    expect(await browser.elementByCss('#router-as-path').text()).toBe('/gsp')
    expect(
      url.parse(await browser.eval(() => window.location.href)).pathname
    ).toBe('/gsp')

    await browser.elementByCss('#to-index').click()
    await browser.waitForElementByCss('#index')

    await checkIndexValues()

    await browser.manage().deleteCookie('NEXT_LOCALE')
  })

  it('should load getStaticProps fallback non-prerender page another locale correctly', async () => {
    const browser = await webdriver(appPort, '/nl-NL/gsp/fallback/another')

    await browser.waitForElementByCss('#props')

    expect(JSON.parse(await browser.elementByCss('#props').text())).toEqual({
      locale: 'nl-NL',
      locales,
      params: {
        slug: 'another',
      },
    })
    expect(
      JSON.parse(await browser.elementByCss('#router-query').text())
    ).toEqual({
      slug: 'another',
    })
    expect(await browser.elementByCss('#router-locale').text()).toBe('nl-NL')
    expect(
      JSON.parse(await browser.elementByCss('#router-locales').text())
    ).toEqual(locales)
  })

  it('should load getStaticProps non-fallback correctly', async () => {
    const browser = await webdriver(appPort, '/en-US/gsp/no-fallback/first')

    await browser.waitForElementByCss('#props')

    expect(JSON.parse(await browser.elementByCss('#props').text())).toEqual({
      locale: 'en-US',
      locales,
      params: {
        slug: 'first',
      },
    })
    expect(
      JSON.parse(await browser.elementByCss('#router-query').text())
    ).toEqual({
      slug: 'first',
    })
    expect(await browser.elementByCss('#router-locale').text()).toBe('en-US')
    expect(
      JSON.parse(await browser.elementByCss('#router-locales').text())
    ).toEqual(locales)
    expect(await browser.elementByCss('html').getAttribute('lang')).toBe(
      'en-US'
    )
  })

  it('should load getStaticProps non-fallback correctly another locale', async () => {
    const browser = await webdriver(appPort, '/nl-NL/gsp/no-fallback/second')

    await browser.waitForElementByCss('#props')

    expect(JSON.parse(await browser.elementByCss('#props').text())).toEqual({
      locale: 'nl-NL',
      locales,
      params: {
        slug: 'second',
      },
    })
    expect(
      JSON.parse(await browser.elementByCss('#router-query').text())
    ).toEqual({
      slug: 'second',
    })
    expect(await browser.elementByCss('#router-locale').text()).toBe('nl-NL')
    expect(
      JSON.parse(await browser.elementByCss('#router-locales').text())
    ).toEqual(locales)
    expect(await browser.elementByCss('html').getAttribute('lang')).toBe(
      'nl-NL'
    )
  })

  it('should load getStaticProps non-fallback correctly another locale via cookie', async () => {
    const html = await renderViaHTTP(
      appPort,
      '/gsp/no-fallback/second',
      {},
      {
        headers: {
          cookie: 'NEXT_LOCALE=nl-NL',
        },
      }
    )
    const $ = cheerio.load(html)

    expect(JSON.parse($('#props').text())).toEqual({
      locale: 'nl-NL',
      locales,
      params: {
        slug: 'second',
      },
    })
    expect(JSON.parse($('#router-query').text())).toEqual({
      slug: 'second',
    })
    expect($('#router-locale').text()).toBe('nl-NL')
    expect(JSON.parse($('#router-locales').text())).toEqual(locales)
    expect($('html').attr('lang')).toBe('nl-NL')
  })

  it('should load getServerSideProps page correctly SSR', async () => {
    const html = await renderViaHTTP(appPort, '/en-US/gssp')
    const $ = cheerio.load(html)

    expect(JSON.parse($('#props').text())).toEqual({
      locale: 'en-US',
      locales,
    })
    expect($('#router-locale').text()).toBe('en-US')
    expect(JSON.parse($('#router-locales').text())).toEqual(locales)
    expect(JSON.parse($('#router-query').text())).toEqual({})
    expect($('html').attr('lang')).toBe('en-US')

    const html2 = await renderViaHTTP(appPort, '/nl-NL/gssp')
    const $2 = cheerio.load(html2)

    expect(JSON.parse($2('#props').text())).toEqual({
      locale: 'nl-NL',
      locales,
    })
    expect($2('#router-locale').text()).toBe('nl-NL')
    expect(JSON.parse($2('#router-locales').text())).toEqual(locales)
    expect(JSON.parse($2('#router-query').text())).toEqual({})
    expect($2('html').attr('lang')).toBe('nl-NL')
  })

  it('should load dynamic getServerSideProps page correctly SSR', async () => {
    const html = await renderViaHTTP(appPort, '/en-US/gssp/first')
    const $ = cheerio.load(html)

    expect(JSON.parse($('#props').text())).toEqual({
      locale: 'en-US',
      locales,
      params: {
        slug: 'first',
      },
    })
    expect($('#router-locale').text()).toBe('en-US')
    expect(JSON.parse($('#router-locales').text())).toEqual(locales)
    expect(JSON.parse($('#router-query').text())).toEqual({ slug: 'first' })
    expect($('html').attr('lang')).toBe('en-US')

    const html2 = await renderViaHTTP(appPort, '/nl-NL/gssp/first')
    const $2 = cheerio.load(html2)

    expect(JSON.parse($2('#props').text())).toEqual({
      locale: 'nl-NL',
      locales,
      params: {
        slug: 'first',
      },
    })
    expect($2('#router-locale').text()).toBe('nl-NL')
    expect(JSON.parse($2('#router-locales').text())).toEqual(locales)
    expect(JSON.parse($2('#router-query').text())).toEqual({ slug: 'first' })
    expect($2('html').attr('lang')).toBe('nl-NL')
  })

  it('should navigate to another page and back correctly with locale', async () => {
    const browser = await webdriver(appPort, '/en')

    await browser.eval('window.beforeNav = "hi"')

    await browser
      .elementByCss('#to-another')
      .click()
      .waitForElementByCss('#another')

    expect(await browser.elementByCss('#router-pathname').text()).toBe(
      '/another'
    )
    expect(await browser.elementByCss('#router-as-path').text()).toBe(
      '/another'
    )
    expect(await browser.elementByCss('#router-locale').text()).toBe('en')
    expect(
      JSON.parse(await browser.elementByCss('#router-locales').text())
    ).toEqual(locales)
    expect(JSON.parse(await browser.elementByCss('#props').text())).toEqual({
      locale: 'en',
      locales,
    })
    expect(
      JSON.parse(await browser.elementByCss('#router-query').text())
    ).toEqual({})
    expect(await browser.eval('window.beforeNav')).toBe('hi')

    await browser.back().waitForElementByCss('#index')
    expect(await browser.eval('window.beforeNav')).toBe('hi')
    expect(await browser.elementByCss('#router-pathname').text()).toBe('/')
    expect(await browser.elementByCss('#router-as-path').text()).toBe('/')
  })

  it('should navigate to getStaticProps page and back correctly with locale', async () => {
    const browser = await webdriver(appPort, '/en')

    await browser.eval('window.beforeNav = "hi"')

    await browser.elementByCss('#to-gsp').click().waitForElementByCss('#gsp')

    expect(await browser.elementByCss('#router-pathname').text()).toBe('/gsp')
    expect(await browser.elementByCss('#router-as-path').text()).toBe('/gsp')
    expect(await browser.elementByCss('#router-locale').text()).toBe('en')
    expect(
      JSON.parse(await browser.elementByCss('#router-locales').text())
    ).toEqual(locales)
    expect(JSON.parse(await browser.elementByCss('#props').text())).toEqual({
      locale: 'en',
      locales,
    })
    expect(
      JSON.parse(await browser.elementByCss('#router-query').text())
    ).toEqual({})
    expect(await browser.eval('window.beforeNav')).toBe('hi')

    await browser.back().waitForElementByCss('#index')
    expect(await browser.eval('window.beforeNav')).toBe('hi')
    expect(await browser.elementByCss('#router-pathname').text()).toBe('/')
    expect(await browser.elementByCss('#router-as-path').text()).toBe('/')
  })
}

describe('i18n Support', () => {
  // TODO: test with next export?
  describe('dev mode', () => {
    beforeAll(async () => {
      await fs.remove(join(appDir, '.next'))
      appPort = await findPort()
      app = await launchApp(appDir, appPort)
      // buildId = 'development'
    })
    afterAll(() => killApp(app))

    runTests()
  })

  describe('production mode', () => {
    beforeAll(async () => {
      await fs.remove(join(appDir, '.next'))
      await nextBuild(appDir)
      appPort = await findPort()
      app = await nextStart(appDir, appPort)
      // buildId = await fs.readFile(join(appDir, '.next/BUILD_ID'), 'utf8')
    })
    afterAll(() => killApp(app))

    runTests()
  })

  describe('serverless mode', () => {
    beforeAll(async () => {
      await fs.remove(join(appDir, '.next'))
      nextConfig.replace('// target', 'target')

      await nextBuild(appDir)
      appPort = await findPort()
      app = await nextStart(appDir, appPort)
      // buildId = await fs.readFile(join(appDir, '.next/BUILD_ID'), 'utf8')
    })
    afterAll(async () => {
      nextConfig.restore()
      await killApp(app)
    })

    runTests()
  })
})
