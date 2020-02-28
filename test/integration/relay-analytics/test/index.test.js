/* eslint-env jest */
/* global jasmine */
import { join } from 'path'
import webdriver from 'next-webdriver'
import { killApp, findPort, nextBuild, nextStart } from 'next-test-utils'

const appDir = join(__dirname, '../')
let appPort
let server
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 2

describe('Analytics relayer', () => {
  beforeAll(async () => {
    appPort = await findPort()
    await nextBuild(appDir)
    server = await nextStart(appDir, appPort)
  })
  afterAll(() => killApp(server))

  it('Relays the data to user code', async () => {
    const browser = await webdriver(appPort, '/')
    await browser.waitForElementByCss('h1')
    const h1Text = await browser.elementByCss('h1').text()
    const data = parseFloat(
      await browser.eval('localStorage.getItem("Next.js-hydration")')
    )
    const firstPaint = parseFloat(
      await browser.eval('localStorage.getItem("first-paint")')
    )
    const firstContentfulPaint = parseFloat(
      await browser.eval('localStorage.getItem("first-contentful-paint")')
    )
    let largestContentfulPaint = await browser.eval(
      'localStorage.getItem("largest-contentful-paint")'
    )
    let cls = await browser.eval(
      'localStorage.getItem("cumulative-layout-shift")'
    )
    expect(h1Text).toMatch(/Foo!/)
    expect(data).not.toBeNaN()
    expect(data).toBeGreaterThan(0)
    expect(firstPaint).not.toBeNaN()
    expect(firstPaint).toBeGreaterThan(0)
    expect(firstContentfulPaint).not.toBeNaN()
    expect(firstContentfulPaint).toBeGreaterThan(0)
    expect(largestContentfulPaint).toBeNull()
    expect(cls).toBeNull()
    // Create an artificial layout shift
    await browser.eval('document.querySelector("h1").style.display = "none"')
    await browser.refresh()
    await browser.waitForElementByCss('h1')
    largestContentfulPaint = parseFloat(
      await browser.eval('localStorage.getItem("largest-contentful-paint")')
    )
    cls = parseFloat(
      await browser.eval('localStorage.getItem("cumulative-layout-shift")')
    )
    expect(cls).not.toBeNull()
    expect(largestContentfulPaint).not.toBeNaN()
    expect(largestContentfulPaint).toBeGreaterThan(0)
    await browser.close()
  })
})
