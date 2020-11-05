/* eslint-env jest */
import execa from 'execa'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'

const cli = require.resolve('create-next-app/dist/index.js')

jest.setTimeout(1000 * 60 * 5)

const run = (cwd, args, input) => {
  const options = input ? { cwd, input } : { cwd }
  return execa('node', [cli].concat(args), options)
}
const runStarter = (cwd, ...args) => {
  const res = run(cwd, args)

  res.stdout.on('data', (data) => {
    const stdout = data.toString()

    if (/Pick a template/.test(stdout)) {
      res.stdin.write('\n')
    }
  })

  return res
}

async function usingTempDir(fn, options) {
  const folder = path.join(os.tmpdir(), Math.random().toString(36).substring(2))
  await fs.mkdirp(folder, options)
  try {
    return await fn(folder)
  } finally {
    await fs.remove(folder)
  }
}

describe('create next app', () => {
  it('non-empty directory', async () => {
    await usingTempDir(async (cwd) => {
      const projectName = 'non-empty-directory'
      await fs.mkdirp(path.join(cwd, projectName))
      const pkg = path.join(cwd, projectName, 'package.json')
      fs.writeFileSync(pkg, '{ "foo": "bar" }')

      expect.assertions(1)
      try {
        await runStarter(cwd, projectName)
      } catch (e) {
        // eslint-disable-next-line jest/no-try-expect
        expect(e.stdout).toMatch(/contains files that could conflict/)
      }
    })
  })

  // TODO: investigate why this test stalls on yarn install when
  // stdin is piped instead of inherited on windows
  if (process.platform !== 'win32') {
    it('empty directory', async () => {
      await usingTempDir(async (cwd) => {
        const projectName = 'empty-directory'
        const res = await runStarter(cwd, projectName)

        expect(res.exitCode).toBe(0)
        expect(
          fs.existsSync(path.join(cwd, projectName, 'package.json'))
        ).toBeTruthy()
        expect(
          fs.existsSync(path.join(cwd, projectName, 'pages/index.js'))
        ).toBeTruthy()
      })
    })
  }

  it('invalid example name', async () => {
    await usingTempDir(async (cwd) => {
      const projectName = 'invalid-example-name'
      expect.assertions(2)
      try {
        await run(cwd, [projectName, '--example', 'not a real example'])
      } catch (e) {
        // eslint-disable-next-line jest/no-try-expect
        expect(e.stderr).toMatch(/Could not locate an example named/i)
      }
      expect(
        fs.existsSync(path.join(cwd, projectName, 'package.json'))
      ).toBeFalsy()
    })
  })

  it('valid example', async () => {
    await usingTempDir(async (cwd) => {
      const projectName = 'valid-example'
      const res = await run(cwd, [projectName, '--example', 'basic-css'])
      expect(res.exitCode).toBe(0)

      expect(
        fs.existsSync(path.join(cwd, projectName, 'package.json'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, 'pages/index.js'))
      ).toBeTruthy()
      // check we copied default `.gitignore`
      expect(
        fs.existsSync(path.join(cwd, projectName, '.gitignore'))
      ).toBeTruthy()
    })
  })

  it('should allow example with GitHub URL', async () => {
    await usingTempDir(async (cwd) => {
      const projectName = 'github-app'
      const res = await run(cwd, [
        projectName,
        '--example',
        'https://github.com/zeit/next-learn-demo/tree/master/1-navigate-between-pages',
      ])

      expect(res.exitCode).toBe(0)
      expect(
        fs.existsSync(path.join(cwd, projectName, 'package.json'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, 'pages/index.js'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, 'pages/about.js'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, '.gitignore'))
      ).toBeTruthy()
    })
  })

  it('should allow example with GitHub URL and example-path', async () => {
    await usingTempDir(async (cwd) => {
      const projectName = 'github-example-path'
      const res = await run(cwd, [
        projectName,
        '--example',
        'https://github.com/zeit/next-learn-demo/tree/master',
        '--example-path',
        '1-navigate-between-pages',
      ])

      expect(res.exitCode).toBe(0)
      expect(
        fs.existsSync(path.join(cwd, projectName, 'package.json'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, 'pages/index.js'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, 'pages/about.js'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, '.gitignore'))
      ).toBeTruthy()
    })
  })

  it('should use --example-path over the file path in the GitHub URL', async () => {
    await usingTempDir(async (cwd) => {
      const projectName = 'github-example-path-2'
      const res = await run(cwd, [
        projectName,
        '--example',
        'https://github.com/zeit/next-learn-demo/tree/master/1-navigate-between-pages',
        '--example-path',
        '1-navigate-between-pages',
      ])

      expect(res.exitCode).toBe(0)
      expect(
        fs.existsSync(path.join(cwd, projectName, 'package.json'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, 'pages/index.js'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, 'pages/about.js'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, '.gitignore'))
      ).toBeTruthy()
    })
  })

  // TODO: investigate why this test stalls on yarn install when
  // stdin is piped instead of inherited on windows
  if (process.platform !== 'win32') {
    it('should fall back to default template', async () => {
      await usingTempDir(async (cwd) => {
        const runExample = (...args) => {
          const res = run(cwd, args)

          function fallbackToTemplate(data) {
            if (
              /Do you want to use the default template instead/.test(
                data.toString()
              )
            ) {
              res.stdout.removeListener('data', fallbackToTemplate)
              res.stdin.write('\n')
            }
          }

          res.stdout.on('data', fallbackToTemplate)

          return res
        }

        const res = await runExample(
          'fail-example',
          '--example',
          '__internal-testing-retry'
        )
        expect(res.exitCode).toBe(0)
      })
    })
  }

  it('should allow an example named default', async () => {
    await usingTempDir(async (cwd) => {
      const projectName = 'default-example'
      const res = await run(cwd, [projectName, '--example', 'default'])
      expect(res.exitCode).toBe(0)

      expect(
        fs.existsSync(path.join(cwd, projectName, 'package.json'))
      ).toBeTruthy()
      expect(
        fs.existsSync(path.join(cwd, projectName, 'pages/index.js'))
      ).toBeTruthy()
      // check we copied default `.gitignore`
      expect(
        fs.existsSync(path.join(cwd, projectName, '.gitignore'))
      ).toBeTruthy()
    })
  })

  it('should exit if example flag is empty', async () => {
    await usingTempDir(async (cwd) => {
      try {
        const projectName = 'no-example-provided'
        await run(cwd, [projectName, '--example'])
      } catch (e) {
        // eslint-disable-next-line jest/no-try-expect
        expect(e.exitCode).toBe(1)
      }
    })
  })

  it('should exit if the folder is not writable', async () => {
    await usingTempDir(async (cwd) => {
      const projectName = 'not-writable'
      expect.assertions(2)
      try {
        const res = await runStarter(cwd, projectName)

        if (process.platform === 'win32') {
          expect(res.exitCode).toBe(0)
          expect(
            fs.existsSync(path.join(cwd, projectName, 'package.json'))
          ).toBeTruthy()
        }
      } catch (e) {
        // eslint-disable-next-line jest/no-try-expect
        expect(e.exitCode).toBe(1)
        // eslint-disable-next-line jest/no-try-expect
        expect(e.stderr).toMatch(
          /you do not have write permissions for this folder/
        )
      }
    }, 0o500)
  })

  it('should create a project in the current directory', async () => {
    await usingTempDir(async (cwd) => {
      const res = await run(cwd, ['.'])
      expect(res.exitCode).toBe(0)

      const files = ['package.json', 'pages/index.js', '.gitignore']
      files.forEach((file) =>
        expect(fs.existsSync(path.join(cwd, file))).toBeTruthy()
      )
    })
  })

  it('should ask the user for a name for the project if none supplied', async () => {
    await usingTempDir(async (cwd) => {
      const projectName = 'test-project'
      const res = await run(cwd, [], `${projectName}\n`)
      expect(res.exitCode).toBe(0)

      const files = ['package.json', 'pages/index.js', '.gitignore']
      files.forEach((file) =>
        expect(fs.existsSync(path.join(cwd, projectName, file))).toBeTruthy()
      )
    })
  })
})
