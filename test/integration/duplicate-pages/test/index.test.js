/* eslint-env jest */

import path from 'path'

import {
  nextBuild,
  findPort,
  launchApp,
  renderViaHTTP,
  killApp,
} from 'next-test-utils'

jest.setTimeout(1000 * 60 * 1)
const appDir = path.join(__dirname, '..')

describe('Handles Duplicate Pages', () => {
  describe('production', () => {
    it('Throws an error during build', async () => {
      const { stdout } = await nextBuild(appDir, [], { stdout: true })
      expect(stdout).toContain('Duplicate page detected')
    })
  })

  describe('dev mode', () => {
    it('Shows warning in development', async () => {
      let output
      const handleOutput = msg => {
        output += msg
      }
      const appPort = await findPort()
      const app = await launchApp(appDir, appPort, {
        onStdout: handleOutput,
        onStderr: handleOutput,
      })
      await renderViaHTTP(appPort, '/hello')
      await killApp(app)
      expect(output).toMatch(/Duplicate page detected/)
    })
  })
})
