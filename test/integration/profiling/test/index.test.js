/* eslint-env jest */

import { join } from 'path'
import { nextBuild } from 'next-test-utils'
import fs from 'fs'
const appDir = join(__dirname, '../')
jest.setTimeout(1000 * 60 * 5)

describe('Profiling Usage', () => {
  beforeAll(async () => {
    await nextBuild(appDir)
  })

  describe('Profiling the build', () => {
    it('should emit files', async () => {
      expect(fs.existsSync(join(appDir, '.next', 'profile-events.json'))).toBe(
        true
      )
    })
  })
})
