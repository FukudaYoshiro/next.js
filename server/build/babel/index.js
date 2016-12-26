import { resolve, join, dirname } from 'path'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'mz/fs'
import { transform } from 'babel-core'
import chokidar from 'chokidar'
import mkdirp from 'mkdirp-then'

export default babel

async function babel (dir, { dev = false } = {}) {
  dir = resolve(dir)

  let src
  try {
    src = await readFile(join(dir, 'pages', '_document.js'), 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') {
      src = await readFile(join(__dirname, '..', '..', '..', 'pages', '_document.js'), 'utf8')
    } else {
      throw err
    }
  }

  let babelOptions = {
    babelrc: true,
    sourceMaps: dev ? 'inline' : false,
    presets: []
  }

  const hasBabelRc = existsSync(join(dir, '.babelrc'))
  if (!hasBabelRc) {
    babelOptions.presets.push(require.resolve('./preset'))
  }

  const { code } = transform(src, babelOptions)

  const file = join(dir, '.next', 'dist', 'pages', '_document.js')
  await mkdirp(dirname(file))
  await writeFile(file, code)
}

export function watch (dir) {
  return chokidar.watch('pages/_document.js', {
    cwd: dir,
    ignoreInitial: true
  })
}
