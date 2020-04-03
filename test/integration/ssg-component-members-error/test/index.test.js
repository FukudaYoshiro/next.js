/* eslint-env jest */
/* global jasmine */
import fs from 'fs-extra'
import { join } from 'path'
import {
  nextBuild,
  launchApp,
  findPort,
  renderViaHTTP,
  killApp,
} from 'next-test-utils'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 2

const appDir = join(__dirname, '..')
const indexPage = join(appDir, 'pages/index.js')
let app
let appPort
let origIndexPage = ''

const runTests = (isDev = false) => {
  const getStderr = async () => {
    if (isDev) {
      let stderr = ''
      appPort = await findPort()
      app = await launchApp(appDir, appPort, {
        onStderr(msg) {
          stderr += msg || ''
        },
      })
      await renderViaHTTP(appPort, '/')
      await killApp(app)
      return stderr
    } else {
      const { stderr } = await nextBuild(appDir, undefined, { stderr: true })
      return stderr
    }
  }

  it('should show error for getStaticProps as component member', async () => {
    await fs.writeFile(
      indexPage,
      `
      const Page = () => 'hi'
      Page.getStaticProps = () => ({ props: { hello: 'world' }})
      export default Page
    `
    )
    expect(await getStderr()).toContain(
      `getStaticProps can not be attached to a page's component and must be exported from the page`
    )
  })

  it('should show error for getServerSideProps as component member', async () => {
    await fs.writeFile(
      indexPage,
      `
      import React from 'react'
      export default class MyPage extends React.Component {
        static async getServerSideProps() {
          return {
            props: {
              hello: 'world'
            }
          }
        }
        render() {
          return 'hi'
        }
      }
    `
    )
    expect(await getStderr()).toContain(
      `getServerSideProps can not be attached to a page's component and must be exported from the page`
    )
  })

  it('should show error for getStaticPaths as component member', async () => {
    await fs.writeFile(
      indexPage,
      `
      const Page = () => 'hi'
      Page.getStaticPaths = () => ({ paths: [], fallback: true })
      export default Page
    `
    )
    expect(await getStderr()).toContain(
      `getStaticPaths can not be attached to a page's component and must be exported from the page`
    )
  })
}

describe('GSSP Page Component Member Error', () => {
  beforeAll(async () => {
    origIndexPage = await fs.readFile(indexPage, 'utf8')
  })
  afterAll(() => fs.writeFile(indexPage, origIndexPage))

  describe('dev mode', () => {
    runTests(true)
  })

  describe('production mode', () => {
    runTests()
  })
})
