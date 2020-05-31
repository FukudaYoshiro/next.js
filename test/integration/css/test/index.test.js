/* eslint-env jest */

import 'flat-map-polyfill'
import { join } from 'path'
import { readdir, readFile, remove } from 'fs-extra'
import {
  findPort,
  nextBuild,
  nextStart,
  launchApp,
  killApp,
  File,
  waitFor,
  renderViaHTTP,
} from 'next-test-utils'
import webdriver from 'next-webdriver'
import cheerio from 'cheerio'

jest.setTimeout(1000 * 60 * 2)

const fixturesDir = join(__dirname, '../..', 'css-fixtures')

describe('CSS Support', () => {
  describe('Basic Global Support', () => {
    const appDir = join(fixturesDir, 'single-global')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted a single CSS file`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      expect(await readFile(join(cssFolder, cssFiles[0]), 'utf8')).toContain(
        'color:red'
      )
    })
  })

  describe('Basic Global Support with src/ dir', () => {
    const appDir = join(fixturesDir, 'single-global-src')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted a single CSS file`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      expect(await readFile(join(cssFolder, cssFiles[0]), 'utf8')).toContain(
        'color:red'
      )
    })
  })

  describe('Multi Global Support', () => {
    const appDir = join(fixturesDir, 'multi-global')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted a single CSS file`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')
      expect(
        cssContent.replace(/\/\*.*?\*\//g, '').trim()
      ).toMatchInlineSnapshot(`".red-text{color:red}.blue-text{color:#00f}"`)
    })
  })

  describe('Nested @import() Global Support', () => {
    const appDir = join(fixturesDir, 'nested-global')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted a single CSS file`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')
      expect(
        cssContent.replace(/\/\*.*?\*\//g, '').trim()
      ).toMatchInlineSnapshot(
        `".red-text{color:purple;font-weight:bolder;color:red}.blue-text{color:orange;font-weight:bolder;color:#00f}"`
      )
    })
  })

  describe('CSS Compilation and Prefixing', () => {
    const appDir = join(fixturesDir, 'compilation-and-prefixing')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've compiled and prefixed`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')
      expect(
        cssContent.replace(/\/\*.*?\*\//g, '').trim()
      ).toMatchInlineSnapshot(
        `"@media (min-width:480px) and (max-width:767px){::-moz-placeholder{color:green}:-ms-input-placeholder{color:green}::-ms-input-placeholder{color:green}::placeholder{color:green}}.flex-parsing{flex:0 0 calc(50% - var(--vertical-gutter))}"`
      )

      // Contains a source map
      expect(cssContent).toMatch(/\/\*#\s*sourceMappingURL=(.+\.map)\s*\*\//)
    })

    it(`should've emitted a source map`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssMapFiles = files.filter((f) => /\.css\.map$/.test(f))

      expect(cssMapFiles.length).toBe(1)
      const cssMapContent = (
        await readFile(join(cssFolder, cssMapFiles[0]), 'utf8')
      ).trim()

      const { version, mappings, sourcesContent } = JSON.parse(cssMapContent)
      expect({ version, mappings, sourcesContent }).toMatchInlineSnapshot(`
        Object {
          "mappings": "AAAA,+CACE,mBACE,WACF,CAFA,uBACE,WACF,CAFA,wBACE,WACF,CAFA,cACE,WACF,CACF,CAEA,cACE,2CACF",
          "sourcesContent": Array [
            "@media (480px <= width < 768px) {
          ::placeholder {
            color: green;
          }
        }

        .flex-parsing {
          flex: 0 0 calc(50% - var(--vertical-gutter));
        }
        ",
          ],
          "version": 3,
        }
      `)
    })
  })

  // Tests css ordering
  describe('Multi Global Support (reversed)', () => {
    const appDir = join(fixturesDir, 'multi-global-reversed')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted a single CSS file`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')
      expect(
        cssContent.replace(/\/\*.*?\*\//g, '').trim()
      ).toMatchInlineSnapshot(`".blue-text{color:#00f}.red-text{color:red}"`)
    })
  })

  describe('Invalid CSS in _document', () => {
    const appDir = join(fixturesDir, 'invalid-module-document')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should fail to build', async () => {
      const { code, stderr } = await nextBuild(appDir, [], {
        stderr: true,
      })
      expect(code).not.toBe(0)
      expect(stderr).toContain('Failed to compile')
      expect(stderr).toContain('styles.module.css')
      expect(stderr).toMatch(
        /CSS.*cannot.*be imported within.*pages[\\/]_document\.js/
      )
      expect(stderr).toMatch(/Location:.*pages[\\/]_document\.js/)
    })
  })

  describe('Invalid Global CSS', () => {
    const appDir = join(fixturesDir, 'invalid-global')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should fail to build', async () => {
      const { code, stderr } = await nextBuild(appDir, [], {
        stderr: true,
      })
      expect(code).not.toBe(0)
      expect(stderr).toContain('Failed to compile')
      expect(stderr).toContain('styles/global.css')
      expect(stderr).toMatch(
        /Please move all global CSS imports.*?pages(\/|\\)_app/
      )
      expect(stderr).toMatch(/Location:.*pages[\\/]index\.js/)
    })
  })

  describe('Invalid Global CSS with Custom App', () => {
    const appDir = join(fixturesDir, 'invalid-global-with-app')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should fail to build', async () => {
      const { code, stderr } = await nextBuild(appDir, [], {
        stderr: true,
      })
      expect(code).not.toBe(0)
      expect(stderr).toContain('Failed to compile')
      expect(stderr).toContain('styles/global.css')
      expect(stderr).toMatch(
        /Please move all global CSS imports.*?pages(\/|\\)_app/
      )
      expect(stderr).toMatch(/Location:.*pages[\\/]index\.js/)
    })
  })

  describe('Valid and Invalid Global CSS with Custom App', () => {
    const appDir = join(fixturesDir, 'valid-and-invalid-global')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should fail to build', async () => {
      const { code, stderr } = await nextBuild(appDir, [], {
        stderr: true,
      })
      expect(code).not.toBe(0)
      expect(stderr).toContain('Failed to compile')
      expect(stderr).toContain('styles/global.css')
      expect(stderr).toContain('Please move all global CSS imports')
      expect(stderr).toMatch(/Location:.*pages[\\/]index\.js/)
    })
  })

  describe('Can hot reload CSS without losing state', () => {
    const appDir = join(fixturesDir, 'multi-page')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    let appPort
    let app
    beforeAll(async () => {
      appPort = await findPort()
      app = await launchApp(appDir, appPort)
    })
    afterAll(async () => {
      await killApp(app)
    })

    it('should update CSS color without remounting <input>', async () => {
      let browser
      try {
        browser = await webdriver(appPort, '/page1')

        const desiredText = 'hello world'
        await browser.elementById('text-input').type(desiredText)
        expect(await browser.elementById('text-input').getValue()).toBe(
          desiredText
        )

        const currentColor = await browser.eval(
          `window.getComputedStyle(document.querySelector('.red-text')).color`
        )
        expect(currentColor).toMatchInlineSnapshot(`"rgb(255, 0, 0)"`)

        const cssFile = new File(join(appDir, 'styles/global1.css'))
        try {
          cssFile.replace('color: red', 'color: purple')
          await waitFor(2000) // wait for HMR

          const refreshedColor = await browser.eval(
            `window.getComputedStyle(document.querySelector('.red-text')).color`
          )
          expect(refreshedColor).toMatchInlineSnapshot(`"rgb(128, 0, 128)"`)

          // ensure text remained
          expect(await browser.elementById('text-input').getValue()).toBe(
            desiredText
          )
        } finally {
          cssFile.restore()
        }
      } finally {
        if (browser) {
          await browser.close()
        }
      }
    })
  })

  describe('Has CSS in computed styles in Development', () => {
    const appDir = join(fixturesDir, 'multi-page')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    let appPort
    let app
    beforeAll(async () => {
      appPort = await findPort()
      app = await launchApp(appDir, appPort)
    })
    afterAll(async () => {
      await killApp(app)
    })

    it('should have CSS for page', async () => {
      let browser
      try {
        browser = await webdriver(appPort, '/page2')

        const currentColor = await browser.eval(
          `window.getComputedStyle(document.querySelector('.blue-text')).color`
        )
        expect(currentColor).toMatchInlineSnapshot(`"rgb(0, 0, 255)"`)
      } finally {
        if (browser) {
          await browser.close()
        }
      }
    })
  })

  describe('Body is not hidden when unused in Development', () => {
    const appDir = join(fixturesDir, 'unused')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    let appPort
    let app
    beforeAll(async () => {
      appPort = await findPort()
      app = await launchApp(appDir, appPort)
    })
    afterAll(async () => {
      await killApp(app)
    })

    it('should have body visible', async () => {
      let browser
      try {
        browser = await webdriver(appPort, '/')
        const currentDisplay = await browser.eval(
          `window.getComputedStyle(document.querySelector('body')).display`
        )
        expect(currentDisplay).toBe('block')
      } finally {
        if (browser) {
          await browser.close()
        }
      }
    })
  })

  describe('Body is not hidden when broken in Development', () => {
    const appDir = join(fixturesDir, 'unused')

    let appPort
    let app
    beforeAll(async () => {
      await remove(join(appDir, '.next'))
      appPort = await findPort()
      app = await launchApp(appDir, appPort)
    })
    afterAll(async () => {
      await killApp(app)
    })

    it('should have body visible', async () => {
      const pageFile = new File(join(appDir, 'pages/index.js'))
      let browser
      try {
        pageFile.replace('<div />', '<div>')
        await waitFor(2000) // wait for recompile

        browser = await webdriver(appPort, '/')
        const currentDisplay = await browser.eval(
          `window.getComputedStyle(document.querySelector('body')).display`
        )
        expect(currentDisplay).toBe('block')
      } finally {
        pageFile.restore()
        if (browser) {
          await browser.close()
        }
      }
    })
  })

  describe('Has CSS in computed styles in Production', () => {
    const appDir = join(fixturesDir, 'multi-page')

    let appPort
    let app
    let stdout
    let code
    beforeAll(async () => {
      await remove(join(appDir, '.next'))
      ;({ code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      }))
      appPort = await findPort()
      app = await nextStart(appDir, appPort)
    })
    afterAll(async () => {
      await killApp(app)
    })

    it('should have compiled successfully', () => {
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it('should have CSS for page', async () => {
      const browser = await webdriver(appPort, '/page2')

      const currentColor = await browser.eval(
        `window.getComputedStyle(document.querySelector('.blue-text')).color`
      )
      expect(currentColor).toMatchInlineSnapshot(`"rgb(0, 0, 255)"`)
    })

    it(`should've preloaded the CSS file and injected it in <head>`, async () => {
      const content = await renderViaHTTP(appPort, '/page2')
      const $ = cheerio.load(content)

      const cssPreload = $('link[rel="preload"][as="style"]')
      expect(cssPreload.length).toBe(1)
      expect(cssPreload.attr('href')).toMatch(/^\/_next\/static\/css\/.*\.css$/)

      const cssSheet = $('link[rel="stylesheet"]')
      expect(cssSheet.length).toBe(1)
      expect(cssSheet.attr('href')).toMatch(/^\/_next\/static\/css\/.*\.css$/)

      /* ensure CSS preloaded first */
      const allPreloads = [].slice.call($('link[rel="preload"]'))
      const styleIndexes = allPreloads.flatMap((p, i) =>
        p.attribs.as === 'style' ? i : []
      )
      expect(styleIndexes).toEqual([0])
    })
  })

  describe('CSS URL via `file-loader`', () => {
    const appDir = join(fixturesDir, 'url-global')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted expected files`, async () => {
      const cssFolder = join(appDir, '.next/static/css')
      const mediaFolder = join(appDir, '.next/static/media')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')
      expect(cssContent.replace(/\/\*.*?\*\//g, '').trim()).toMatch(
        /^\.red-text\{color:red;background-image:url\(\/_next\/static\/media\/dark\.[a-z0-9]{32}\.svg\) url\(\/_next\/static\/media\/dark2\.[a-z0-9]{32}\.svg\)\}\.blue-text\{color:orange;font-weight:bolder;background-image:url\(\/_next\/static\/media\/light\.[a-z0-9]{32}\.svg\);color:#00f\}$/
      )

      const mediaFiles = await readdir(mediaFolder)
      expect(mediaFiles.length).toBe(3)
      expect(
        mediaFiles
          .map((fileName) =>
            /^(.+?)\..{32}\.(.+?)$/.exec(fileName).slice(1).join('.')
          )
          .sort()
      ).toMatchInlineSnapshot(`
        Array [
          "dark.svg",
          "dark2.svg",
          "light.svg",
        ]
      `)
    })
  })

  describe('CSS URL via `file-loader` and asset prefix (1)', () => {
    const appDir = join(fixturesDir, 'url-global-asset-prefix-1')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted expected files`, async () => {
      const cssFolder = join(appDir, '.next/static/css')
      const mediaFolder = join(appDir, '.next/static/media')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')
      expect(cssContent.replace(/\/\*.*?\*\//g, '').trim()).toMatch(
        /^\.red-text\{color:red;background-image:url\(\/foo\/_next\/static\/media\/dark\.[a-z0-9]{32}\.svg\) url\(\/foo\/_next\/static\/media\/dark2\.[a-z0-9]{32}\.svg\)\}\.blue-text\{color:orange;font-weight:bolder;background-image:url\(\/foo\/_next\/static\/media\/light\.[a-z0-9]{32}\.svg\);color:#00f\}$/
      )

      const mediaFiles = await readdir(mediaFolder)
      expect(mediaFiles.length).toBe(3)
      expect(
        mediaFiles
          .map((fileName) =>
            /^(.+?)\..{32}\.(.+?)$/.exec(fileName).slice(1).join('.')
          )
          .sort()
      ).toMatchInlineSnapshot(`
        Array [
          "dark.svg",
          "dark2.svg",
          "light.svg",
        ]
      `)
    })
  })

  describe('CSS URL via `file-loader` and asset prefix (2)', () => {
    const appDir = join(fixturesDir, 'url-global-asset-prefix-2')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted expected files`, async () => {
      const cssFolder = join(appDir, '.next/static/css')
      const mediaFolder = join(appDir, '.next/static/media')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')
      expect(cssContent.replace(/\/\*.*?\*\//g, '').trim()).toMatch(
        /^\.red-text\{color:red;background-image:url\(\/foo\/_next\/static\/media\/dark\.[a-z0-9]{32}\.svg\) url\(\/foo\/_next\/static\/media\/dark2\.[a-z0-9]{32}\.svg\)\}\.blue-text\{color:orange;font-weight:bolder;background-image:url\(\/foo\/_next\/static\/media\/light\.[a-z0-9]{32}\.svg\);color:#00f\}$/
      )

      const mediaFiles = await readdir(mediaFolder)
      expect(mediaFiles.length).toBe(3)
      expect(
        mediaFiles
          .map((fileName) =>
            /^(.+?)\..{32}\.(.+?)$/.exec(fileName).slice(1).join('.')
          )
          .sort()
      ).toMatchInlineSnapshot(`
        Array [
          "dark.svg",
          "dark2.svg",
          "light.svg",
        ]
      `)
    })
  })

  describe('Good CSS Import from node_modules', () => {
    const appDir = join(fixturesDir, 'npm-import')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted a single CSS file`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')
      expect(cssContent.replace(/\/\*.*?\*\//g, '').trim()).toMatch(/nprogress/)
    })
  })

  describe('Good Nested CSS Import from node_modules', () => {
    const appDir = join(fixturesDir, 'npm-import-nested')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've emitted a single CSS file`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')
      expect(
        cssContent.replace(/\/\*.*?\*\//g, '').trim()
      ).toMatchInlineSnapshot(`".other{color:#00f}.test{color:red}"`)
    })
  })

  describe('Bad CSS Import from node_modules', () => {
    const appDir = join(fixturesDir, 'npm-import-bad')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should fail the build', async () => {
      const { code, stderr } = await nextBuild(appDir, [], { stderr: true })

      expect(code).not.toBe(0)
      expect(stderr).toMatch(/Can't resolve '[^']*?nprogress[^']*?'/)
      expect(stderr).toMatch(/Build error occurred/)
    })
  })

  describe('Ordering with styled-jsx (dev)', () => {
    const appDir = join(fixturesDir, 'with-styled-jsx')

    let appPort
    let app
    beforeAll(async () => {
      await remove(join(appDir, '.next'))
      appPort = await findPort()
      app = await launchApp(appDir, appPort)
    })
    afterAll(async () => {
      await killApp(app)
    })

    it('should have the correct color (css ordering)', async () => {
      const browser = await webdriver(appPort, '/')

      const currentColor = await browser.eval(
        `window.getComputedStyle(document.querySelector('.my-text')).color`
      )
      expect(currentColor).toMatchInlineSnapshot(`"rgb(0, 128, 0)"`)
    })
  })

  describe('Ordering with styled-jsx (prod)', () => {
    const appDir = join(fixturesDir, 'with-styled-jsx')

    let appPort
    let app
    let stdout
    let code
    beforeAll(async () => {
      await remove(join(appDir, '.next'))
      ;({ code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      }))
      appPort = await findPort()
      app = await nextStart(appDir, appPort)
    })
    afterAll(async () => {
      await killApp(app)
    })

    it('should have compiled successfully', () => {
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it('should have the correct color (css ordering)', async () => {
      const browser = await webdriver(appPort, '/')

      const currentColor = await browser.eval(
        `window.getComputedStyle(document.querySelector('.my-text')).color`
      )
      expect(currentColor).toMatchInlineSnapshot(`"rgb(0, 128, 0)"`)
    })
  })

  describe('Ordering with Global CSS and Modules (dev)', () => {
    const appDir = join(fixturesDir, 'global-and-module-ordering')

    let appPort
    let app
    beforeAll(async () => {
      await remove(join(appDir, '.next'))
      appPort = await findPort()
      app = await launchApp(appDir, appPort)
    })
    afterAll(async () => {
      await killApp(app)
    })

    it('should have the correct color (css ordering)', async () => {
      const browser = await webdriver(appPort, '/')

      const currentColor = await browser.eval(
        `window.getComputedStyle(document.querySelector('#blueText')).color`
      )
      expect(currentColor).toMatchInlineSnapshot(`"rgb(0, 0, 255)"`)
    })

    it('should have the correct color (css ordering) during hot reloads', async () => {
      let browser
      try {
        browser = await webdriver(appPort, '/')

        const currentColor = await browser.eval(
          `window.getComputedStyle(document.querySelector('#blueText')).color`
        )
        expect(currentColor).toMatchInlineSnapshot(`"rgb(0, 0, 255)"`)

        const cssFile = new File(join(appDir, 'pages/index.module.css'))
        try {
          cssFile.replace('color: blue;', 'color: blue; ')
          await waitFor(2000) // wait for HMR

          const refreshedColor = await browser.eval(
            `window.getComputedStyle(document.querySelector('#blueText')).color`
          )
          expect(refreshedColor).toMatchInlineSnapshot(`"rgb(0, 0, 255)"`)
        } finally {
          cssFile.restore()
        }
      } finally {
        if (browser) {
          await browser.close()
        }
      }
    })
  })

  describe('Ordering with Global CSS and Modules (prod)', () => {
    const appDir = join(fixturesDir, 'global-and-module-ordering')

    let appPort
    let app
    let stdout
    let code
    beforeAll(async () => {
      await remove(join(appDir, '.next'))
      ;({ code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      }))
      appPort = await findPort()
      app = await nextStart(appDir, appPort)
    })
    afterAll(async () => {
      await killApp(app)
    })

    it('should have compiled successfully', () => {
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it('should have the correct color (css ordering)', async () => {
      const browser = await webdriver(appPort, '/')

      const currentColor = await browser.eval(
        `window.getComputedStyle(document.querySelector('#blueText')).color`
      )
      expect(currentColor).toMatchInlineSnapshot(`"rgb(0, 0, 255)"`)
    })
  })

  describe('Basic Tailwind CSS', () => {
    const appDir = join(fixturesDir, 'with-tailwindcss')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
      expect(stdout).toContain('.css')
    })

    it(`should've compiled and prefixed`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')

      expect(cssContent).toMatch(/object-right-bottom/) // look for tailwind's CSS
      expect(cssContent).not.toMatch(/tailwind/) // ensure @tailwind was removed

      // Contains a source map
      expect(cssContent).toMatch(/\/\*#\s*sourceMappingURL=(.+\.map)\s*\*\//)
    })

    it(`should've emitted a source map`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssMapFiles = files.filter((f) => /\.css\.map$/.test(f))

      expect(cssMapFiles.length).toBe(1)
    })
  })

  describe('Tailwind and Purge CSS', () => {
    const appDir = join(fixturesDir, 'with-tailwindcss-and-purgecss')

    beforeAll(async () => {
      await remove(join(appDir, '.next'))
    })

    it('should compile successfully', async () => {
      const { code, stdout } = await nextBuild(appDir, [], {
        stdout: true,
      })
      expect(code).toBe(0)
      expect(stdout).toMatch(/Compiled successfully/)
    })

    it(`should've compiled and prefixed`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssFiles = files.filter((f) => /\.css$/.test(f))

      expect(cssFiles.length).toBe(1)
      const cssContent = await readFile(join(cssFolder, cssFiles[0]), 'utf8')

      expect(cssContent).not.toMatch(/object-right-bottom/) // this was unused and should be gone
      expect(cssContent).toMatch(/text-blue-500/) // this was used
      expect(cssContent).not.toMatch(/tailwind/) // ensure @tailwind was removed

      // Contains a source map
      expect(cssContent).toMatch(/\/\*#\s*sourceMappingURL=(.+\.map)\s*\*\//)
    })

    it(`should've emitted a source map`, async () => {
      const cssFolder = join(appDir, '.next/static/css')

      const files = await readdir(cssFolder)
      const cssMapFiles = files.filter((f) => /\.css\.map$/.test(f))

      expect(cssMapFiles.length).toBe(1)
    })
  })
})
