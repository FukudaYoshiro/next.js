/* eslint-env jest */
/* global jasmine */
import fs from 'fs-extra'
import { join } from 'path'
import cheerio from 'cheerio'
import {
  renderViaHTTP,
  findPort,
  launchApp,
  killApp,
  waitFor,
} from 'next-test-utils'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 2

const appDir = join(__dirname, '..')
let appPort
let app

async function get$(path, query) {
  const html = await renderViaHTTP(appPort, path, query)
  return cheerio.load(html)
}

describe('TypeScript Features', () => {
  describe('default behavior', () => {
    let output = ''

    beforeAll(async () => {
      appPort = await findPort()
      app = await launchApp(appDir, appPort, {
        onStdout(msg) {
          output += msg || ''
        },
        onStderr(msg) {
          output += msg || ''
        },
      })
    })
    afterAll(() => killApp(app))

    it('should render the page', async () => {
      const $ = await get$('/hello')
      expect($('body').text()).toMatch(/World/)
    })

    it('should have correct module not found error', async () => {
      const basicPage = join(appDir, 'pages/hello.js')
      const contents = await fs.readFile(basicPage, 'utf8')

      await fs.writeFile(
        basicPage,
        contents.replace('components/world', 'components/worldd')
      )
      await renderViaHTTP(appPort, '/hello')

      await waitFor(2 * 1000)
      await fs.writeFile(basicPage, contents)
      expect(output).toContain(
        `Module not found: Can't resolve 'components/worldd' in`
      )
    })
  })
})
