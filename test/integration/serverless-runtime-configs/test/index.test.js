/* eslint-env jest */
/* global jasmine */
import fs from 'fs-extra'
import { join } from 'path'
import {
  nextBuild,
  findPort,
  killApp,
  renderViaHTTP,
  initNextServerScript,
} from 'next-test-utils'
import cheerio from 'cheerio'
import webdriver from 'next-webdriver'

const appDir = join(__dirname, '../')
const nextConfigPath = join(appDir, 'next.config.js')
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 2

const cleanUp = () => fs.remove(nextConfigPath)

const nextStart = async (appDir, appPort) => {
  const scriptPath = join(appDir, 'server.js')
  const env = Object.assign({ ...process.env }, { PORT: `${appPort}` })

  return initNextServerScript(
    scriptPath,
    /ready on/i,
    env,
    /ReferenceError: options is not defined/
  )
}

describe('Serverless runtime configs', () => {
  beforeAll(() => cleanUp())
  afterAll(() => cleanUp())

  it('should not error on usage of publicRuntimeConfig', async () => {
    await fs.writeFile(
      nextConfigPath,
      `module.exports = {
      target: 'serverless',
      publicRuntimeConfig: {
        hello: 'world'
      }
    }`
    )

    const { stderr, code } = await nextBuild(appDir, undefined, {
      stderr: true,
    })
    expect(code).toBe(0)
    expect(stderr).not.toMatch(
      /Cannot use publicRuntimeConfig or serverRuntimeConfig/
    )
  })

  it('should not error on usage of serverRuntimeConfig', async () => {
    await fs.writeFile(
      nextConfigPath,
      `module.exports = {
      target: 'serverless',
      serverRuntimeConfig: {
        hello: 'world'
      }
    }`
    )

    const { stderr, code } = await nextBuild(appDir, undefined, {
      stderr: true,
    })
    expect(code).toBe(0)
    expect(stderr).not.toMatch(
      /Cannot use publicRuntimeConfig or serverRuntimeConfig/
    )
  })

  it('should support runtime configs in serverless mode', async () => {
    await fs.writeFile(
      nextConfigPath,
      `module.exports = {
        target: 'serverless',
        serverRuntimeConfig: {
          hello: 'world'
        },
        publicRuntimeConfig: {
          another: 'thing'
        }
      }`
    )

    await nextBuild(appDir, [], { stderr: true, stdout: true })
    const appPort = await findPort()
    const app = await nextStart(appDir, appPort)

    const browser = await webdriver(appPort, '/config')

    const clientHTML = await browser.eval(`document.documentElement.innerHTML`)
    const ssrHTML = await renderViaHTTP(appPort, '/config')
    const apiJson = await renderViaHTTP(appPort, '/api/config')

    await killApp(app)
    await fs.remove(nextConfigPath)

    const ssr$ = cheerio.load(ssrHTML)
    const client$ = cheerio.load(clientHTML)

    const ssrConfig = ssr$('#config').text()
    const clientConfig = client$('#config').text()

    const expectedSsrConfig = {
      publicRuntimeConfig: {
        another: 'thing',
      },
      serverRuntimeConfig: {
        hello: 'world',
      },
    }

    const expectedClientConfig = {
      publicRuntimeConfig: {
        another: 'thing',
      },
      serverRuntimeConfig: {},
    }

    expect(JSON.parse(ssrConfig)).toEqual(expectedSsrConfig)
    expect(JSON.parse(clientConfig)).toEqual(expectedClientConfig)

    const appSsrConfig = ssr$('#app-config').text()
    const appClientConfig = client$('#app-config').text()

    expect(JSON.parse(appSsrConfig)).toEqual(expectedSsrConfig)
    expect(JSON.parse(appClientConfig)).toEqual(expectedClientConfig)

    const docSsrConfig = ssr$('#doc-config').text()
    const docClientConfig = client$('#doc-config').text()

    // _document doesn't update on client so should be the same
    expect(JSON.parse(docSsrConfig)).toEqual(expectedSsrConfig)
    expect(JSON.parse(docClientConfig)).toEqual(expectedSsrConfig)

    expect(JSON.parse(apiJson)).toEqual(expectedSsrConfig)
  })
})
