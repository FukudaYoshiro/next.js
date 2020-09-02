/* eslint-env jest */

import { join } from 'path'
import webdriver from 'next-webdriver'
import { killApp, findPort, launchApp, File, check } from 'next-test-utils'

jest.setTimeout(1000 * 60 * 2)
const appDir = join(__dirname, '..')

let appPort
let app

describe('GS(S)P Server-Side Change Reloading', () => {
  beforeAll(async () => {
    appPort = await findPort()
    app = await launchApp(appDir, appPort)
  })
  afterAll(() => killApp(app))

  it('should not reload page when client-side is changed too GSP', async () => {
    const browser = await webdriver(appPort, '/gsp-blog/first')
    await browser.eval(() => (window.beforeChange = 'hi'))

    const props = JSON.parse(await browser.elementByCss('#props').text())

    const page = new File(join(appDir, 'pages/gsp-blog/[post].js'))
    page.replace('change me', 'changed')

    await check(() => browser.elementByCss('#change').text(), 'changed')
    expect(await browser.eval(() => window.beforeChange)).toBe('hi')

    const props2 = JSON.parse(await browser.elementByCss('#props').text())
    expect(props).toEqual(props2)

    page.restore()

    await check(() => browser.elementByCss('#change').text(), 'change me')
  })

  it('should update page when getStaticProps is changed only', async () => {
    const browser = await webdriver(appPort, '/gsp-blog/first')
    await browser.eval(() => (window.beforeChange = 'hi'))

    const props = JSON.parse(await browser.elementByCss('#props').text())
    expect(props.count).toBe(1)

    const page = new File(join(appDir, 'pages/gsp-blog/[post].js'))
    page.replace('count = 1', 'count = 2')

    await check(
      async () =>
        JSON.parse(await browser.elementByCss('#props').text()).count + '',
      '2'
    )
    expect(await browser.eval(() => window.beforeChange)).toBe('hi')
    page.restore()

    await check(
      async () =>
        JSON.parse(await browser.elementByCss('#props').text()).count + '',
      '1'
    )
  })

  it('should update page when getStaticPaths is changed only', async () => {
    const browser = await webdriver(appPort, '/gsp-blog/first')
    await browser.eval(() => (window.beforeChange = 'hi'))

    const props = JSON.parse(await browser.elementByCss('#props').text())
    expect(props.count).toBe(1)

    const page = new File(join(appDir, 'pages/gsp-blog/[post].js'))
    page.replace('paths = 1', 'paths = 2')

    expect(await browser.eval('window.beforeChange')).toBe('hi')
    page.restore()
  })

  it('should not reload page when client-side is changed too GSSP', async () => {
    const browser = await webdriver(appPort, '/gssp-blog/first')
    await browser.eval(() => (window.beforeChange = 'hi'))

    const props = JSON.parse(await browser.elementByCss('#props').text())

    const page = new File(join(appDir, 'pages/gssp-blog/[post].js'))
    page.replace('change me', 'changed')

    await check(() => browser.elementByCss('#change').text(), 'changed')
    expect(await browser.eval(() => window.beforeChange)).toBe('hi')

    const props2 = JSON.parse(await browser.elementByCss('#props').text())
    expect(props).toEqual(props2)

    page.restore()

    await check(() => browser.elementByCss('#change').text(), 'change me')
  })

  it('should update page when getServerSideProps is changed only', async () => {
    const browser = await webdriver(appPort, '/gssp-blog/first')
    await browser.eval(() => (window.beforeChange = 'hi'))

    const props = JSON.parse(await browser.elementByCss('#props').text())
    expect(props.count).toBe(1)

    const page = new File(join(appDir, 'pages/gssp-blog/[post].js'))
    page.replace('count = 1', 'count = 2')

    await check(
      async () =>
        JSON.parse(await browser.elementByCss('#props').text()).count + '',
      '2'
    )
    expect(await browser.eval(() => window.beforeChange)).toBe('hi')
    page.restore()

    await check(
      async () =>
        JSON.parse(await browser.elementByCss('#props').text()).count + '',
      '1'
    )
  })
})
