/* eslint-env jest */
/* global jasmine */
import 'flat-map-polyfill'
import { remove } from 'fs-extra'
import { nextBuild } from 'next-test-utils'
import { join } from 'path'
import { recursiveReadDir } from 'next/dist/lib/recursive-readdir'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 2

const fixturesDir = join(__dirname, '..', 'fixtures')

describe('Build Output', () => {
  describe('Basic Application Output', () => {
    const appDir = join(fixturesDir, 'basic-app')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should not include internal pages', async () => {
      const { stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })

      expect(stdout).toMatch(/\/ [ ]* \d{1,} B/)
      expect(stdout).toMatch(/\+ First Load JS shared by all [ 0-9.]* kB/)
      expect(stdout).toMatch(/ runtime\/main\.[0-9a-z]{6}\.js [ 0-9.]* kB/)
      expect(stdout).toMatch(/ chunks\/framework\.[0-9a-z]{6}\.js [ 0-9. ]* kB/)

      expect(stdout).not.toContain(' /_document')
      expect(stdout).not.toContain(' /_app')
      expect(stdout).not.toContain(' /_error')
      expect(stdout).not.toContain('<buildId>')

      expect(stdout).toContain('○ /')
    })

    it('should not emit extracted comments', async () => {
      const files = await recursiveReadDir(
        join(appDir, '.next'),
        /\.txt|\.LICENSE\./
      )
      expect(files).toEqual([])
    })
  })

  describe('Custom App Output', () => {
    const appDir = join(fixturesDir, 'with-app')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should not include custom error', async () => {
      const { stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })

      expect(stdout).toMatch(/\/ [ ]* \d{1,} B/)
      expect(stdout).toMatch(/\/_app [ ]* \d{1,} B/)
      expect(stdout).toMatch(/\+ First Load JS shared by all [ 0-9.]* kB/)
      expect(stdout).toMatch(/ runtime\/main\.[0-9a-z]{6}\.js [ 0-9.]* kB/)
      expect(stdout).toMatch(/ chunks\/framework\.[0-9a-z]{6}\.js [ 0-9. ]* kB/)

      expect(stdout).not.toContain(' /_document')
      expect(stdout).not.toContain(' /_error')
      expect(stdout).not.toContain('<buildId>')

      expect(stdout).toContain(' /_app')
      expect(stdout).toContain('○ /')
    })
  })

  describe('With AMP Output', () => {
    const appDir = join(fixturesDir, 'with-amp')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should not include custom error', async () => {
      const { stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })

      expect(stdout).toMatch(/\/ [ 0-9.]* B [ 0-9.]* kB/)
      expect(stdout).toMatch(/\/amp .* AMP/)
      expect(stdout).toMatch(/\/hybrid [ 0-9.]* B/)
      expect(stdout).toMatch(/\+ First Load JS shared by all [ 0-9.]* kB/)
      expect(stdout).toMatch(/ runtime\/main\.[0-9a-z]{6}\.js [ 0-9.]* kB/)
      expect(stdout).toMatch(/ chunks\/framework\.[0-9a-z]{6}\.js [ 0-9. ]* kB/)

      expect(stdout).not.toContain(' /_document')
      expect(stdout).not.toContain(' /_error')
      expect(stdout).not.toContain('<buildId>')

      expect(stdout).toContain('○ /')
    })
  })

  describe('Custom Error Output', () => {
    const appDir = join(fixturesDir, 'with-error')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should not include custom app', async () => {
      const { stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })

      expect(stdout).toMatch(/\/ [ ]* \d{1,} B/)
      expect(stdout).toMatch(/λ \/404 [ ]* \d{1,} B/)
      expect(stdout).toMatch(/\+ First Load JS shared by all [ 0-9.]* kB/)
      expect(stdout).toMatch(/ runtime\/main\.[0-9a-z]{6}\.js [ 0-9.]* kB/)
      expect(stdout).toMatch(/ chunks\/framework\.[0-9a-z]{6}\.js [ 0-9. ]* kB/)

      expect(stdout).not.toContain(' /_document')
      expect(stdout).not.toContain(' /_app')
      expect(stdout).not.toContain('<buildId>')

      expect(stdout).not.toContain(' /_error')
      expect(stdout).toContain('○ /')
    })
  })

  describe('Custom Static Error Output', () => {
    const appDir = join(fixturesDir, 'with-error-static')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should not specify /404 as lambda when static', async () => {
      const { stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(stdout).toContain('○ /404')
      expect(stdout).not.toContain('λ /_error')
      expect(stdout).not.toContain('<buildId>')
    })
  })
})
