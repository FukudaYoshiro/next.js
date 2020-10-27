/* eslint-env jest */

import url from 'url'
import fs from 'fs-extra'
import webdriver from 'next-webdriver'
import { join } from 'path'
import {
  findPort,
  launchApp,
  killApp,
  nextBuild,
  nextStart,
  fetchViaHTTP,
  check,
} from 'next-test-utils'

jest.setTimeout(1000 * 60 * 2)
const appDir = join(__dirname, '..')
const nextConfig = join(appDir, 'next.config.js')

let app
let appPort

const runTests = () => {
  it('should apply temporary redirect when visited directly for GSSP page', async () => {
    const res = await fetchViaHTTP(
      appPort,
      '/gssp-blog/redirect-1',
      undefined,
      {
        redirect: 'manual',
      }
    )
    expect(res.status).toBe(307)

    const { pathname } = url.parse(res.headers.get('location'))

    expect(pathname).toBe('/404')
  })

  it('should apply permanent redirect when visited directly for GSSP page', async () => {
    const res = await fetchViaHTTP(
      appPort,
      '/gssp-blog/redirect-permanent',
      undefined,
      {
        redirect: 'manual',
      }
    )
    expect(res.status).toBe(308)

    const { pathname } = url.parse(res.headers.get('location'))

    expect(pathname).toBe('/404')
    expect(res.headers.get('refresh')).toMatch(/url=\/404/)
  })

  it('should apply redirect when fallback GSP page is visited directly (internal dynamic)', async () => {
    const browser = await webdriver(
      appPort,
      '/gsp-blog/redirect-dest-_gsp-blog_first'
    )

    await browser.waitForElementByCss('#gsp')

    const props = JSON.parse(await browser.elementByCss('#props').text())
    expect(props).toEqual({
      params: {
        post: 'first',
      },
    })
    const initialHref = await browser.eval(() => window.initialHref)
    const { pathname } = url.parse(initialHref)
    expect(pathname).toBe('/gsp-blog/redirect-dest-_gsp-blog_first')
  })

  it('should apply redirect when fallback GSP page is visited directly (internal normal)', async () => {
    const browser = await webdriver(appPort, '/gsp-blog/redirect-dest-_')

    await browser.waitForElementByCss('#index')

    const initialHref = await browser.eval(() => window.initialHref)
    const { pathname } = url.parse(initialHref)
    expect(pathname).toBe('/gsp-blog/redirect-dest-_')
  })

  it('should apply redirect when fallback GSP page is visited directly (external)', async () => {
    const browser = await webdriver(appPort, '/gsp-blog/redirect-dest-_missing')

    await check(
      () => browser.eval(() => document.documentElement.innerHTML),
      /oops not found/
    )

    const initialHref = await browser.eval(() => window.initialHref)
    expect(initialHref).toBe(null)

    const curUrl = await browser.url()
    const { pathname } = url.parse(curUrl)
    expect(pathname).toBe('/missing')
  })

  it('should apply redirect when GSSP page is navigated to client-side (internal dynamic)', async () => {
    const browser = await webdriver(
      appPort,
      '/gssp-blog/redirect-dest-_gssp-blog_first'
    )

    await browser.waitForElementByCss('#gssp')

    const props = JSON.parse(await browser.elementByCss('#props').text())
    expect(props).toEqual({
      params: {
        post: 'first',
      },
    })
  })

  it('should apply redirect when GSSP page is navigated to client-side (internal normal)', async () => {
    const browser = await webdriver(appPort, '/')

    await browser.eval(`(function () {
      window.next.router.push('/gssp-blog/redirect-dest-_another')
    })()`)
    await browser.waitForElementByCss('#another')

    const text = await browser.elementByCss('#another').text()

    expect(text).toEqual('another Page')
  })

  it('should apply redirect when GSSP page is navigated to client-side (external)', async () => {
    const browser = await webdriver(appPort, '/')

    await browser.eval(`(function () {
      window.next.router.push('/gssp-blog/redirect-dest-_gssp-blog_first')
    })()`)
    await browser.waitForElementByCss('#gssp')

    const props = JSON.parse(await browser.elementByCss('#props').text())

    expect(props).toEqual({
      params: {
        post: 'first',
      },
    })
  })

  it('should apply redirect when GSP page is navigated to client-side (internal)', async () => {
    const browser = await webdriver(appPort, '/')

    await browser.eval(`(function () {
      window.next.router.push('/gsp-blog/redirect-dest-_another')
    })()`)
    await browser.waitForElementByCss('#another')

    const text = await browser.elementByCss('#another').text()

    expect(text).toEqual('another Page')
  })

  it('should apply redirect when GSP page is navigated to client-side (external)', async () => {
    const browser = await webdriver(appPort, '/')

    await browser.eval(`(function () {
      window.next.router.push('/gsp-blog/redirect-dest-_gsp-blog_first')
    })()`)
    await browser.waitForElementByCss('#gsp')

    const props = JSON.parse(await browser.elementByCss('#props').text())

    expect(props).toEqual({
      params: {
        post: 'first',
      },
    })
  })

  it('should not replace history of the origin page when GSSP page is navigated to client-side (internal normal)', async () => {
    const browser = await webdriver(appPort, '/another?mark_as=root')

    await browser.eval(`(function () {
      window.location.href = '/'
    })()`)
    await browser.waitForElementByCss('#index')

    await browser.eval(`(function () {
      window.next.router.push('/gssp-blog/redirect-dest-_another')
    })()`)
    await browser.waitForElementByCss('#another')

    await browser.eval(`(function () {
      window.history.back()
    })()`)

    const curUrl = await browser.url()
    const { path } = url.parse(curUrl)
    expect(path).toEqual('/')
  })

  it('should not replace history of the origin page when GSSP page is navigated to client-side (external)', async () => {
    const browser = await webdriver(appPort, '/another?mark_as=root')

    await browser.eval(`(function () {
      window.location.href = '/'
    })()`)
    await browser.waitForElementByCss('#index')

    await browser.eval(`(function () {
      window.next.router.push('/gssp-blog/redirect-dest-_gssp-blog_first')
    })()`)
    await browser.waitForElementByCss('#gssp')

    await browser.eval(`(function () {
      window.history.back()
    })()`)

    const curUrl = await browser.url()
    const { path } = url.parse(curUrl)
    expect(path).toEqual('/')
  })

  it('should not replace history of the origin page when GSP page is navigated to client-side (internal)', async () => {
    const browser = await webdriver(appPort, '/another?mark_as=root')

    await browser.eval(`(function () {
      window.location.href = '/'
    })()`)
    await browser.waitForElementByCss('#index')

    await browser.eval(`(function () {
      window.next.router.push('/gsp-blog/redirect-dest-_another')
    })()`)
    await browser.waitForElementByCss('#another')

    await browser.eval(`(function () {
      window.history.back()
    })()`)

    const curUrl = await browser.url()
    const { path } = url.parse(curUrl)
    expect(path).toEqual('/')
  })

  it('should not replace history of the origin page when GSP page is navigated to client-side (external)', async () => {
    const browser = await webdriver(appPort, '/another?mark_as=root')

    await browser.eval(`(function () {
      window.location.href = '/'
    })()`)
    await browser.waitForElementByCss('#index')

    await browser.eval(`(function () {
      window.next.router.push('/gsp-blog/redirect-dest-_gsp-blog_first')
    })()`)
    await browser.waitForElementByCss('#gsp')

    await browser.eval(`(function () {
      window.history.back()
    })()`)

    const curUrl = await browser.url()
    const { path } = url.parse(curUrl)
    expect(path).toEqual('/')
  })
}

describe('GS(S)P Redirect Support', () => {
  describe('dev mode', () => {
    beforeAll(async () => {
      appPort = await findPort()
      app = await launchApp(appDir, appPort)
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
    })
    afterAll(() => killApp(app))

    runTests()
  })

  describe('serverless mode', () => {
    beforeAll(async () => {
      await fs.writeFile(
        nextConfig,
        `module.exports = {
        target: 'experimental-serverless-trace'
      }`
      )
      await fs.remove(join(appDir, '.next'))
      await nextBuild(appDir)
      appPort = await findPort()
      app = await nextStart(appDir, appPort)
    })
    afterAll(async () => {
      await fs.remove(nextConfig)
      await killApp(app)
    })

    runTests()
  })

  it('should error for redirect during prerendering', async () => {
    await fs.mkdirp(join(appDir, 'pages/invalid'))
    await fs.writeFile(
      join(appDir, 'pages', 'invalid', '[slug].js'),
      `
        export default function Post(props) {
          return "hi"
        }

        export const getStaticProps = ({ params }) => {
          return {
            unstable_redirect: {
              permanent: true,
              destination: '/another'
            }
          }
        }

        export const getStaticPaths = () => {
          return {
            paths: ['first', 'second'].map((slug) => ({ params: { slug } })),
            fallback: true,
          }
        }
      `
    )
    const { stdout, stderr } = await nextBuild(appDir, undefined, {
      stdout: true,
      stderr: true,
    })
    const output = stdout + stderr
    await fs.remove(join(appDir, 'pages/invalid'))

    expect(output).toContain(
      '`redirect` can not be returned from getStaticProps during prerendering'
    )
  })
})
