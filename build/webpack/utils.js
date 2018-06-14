import path from 'path'
import promisify from '../../lib/promisify'
import globModule from 'glob'

const glob = promisify(globModule)

export async function getPages (dir, {nextPagesDir, dev, isServer, pageExtensions}) {
  const pageFiles = await getPagePaths(dir, {dev, isServer, pageExtensions})

  return getPageEntries(pageFiles, {nextPagesDir, isServer, pageExtensions})
}

export async function getPagePaths (dir, {dev, isServer, pageExtensions}) {
  let pages

  if (dev) {
    // In development we only compile _document.js, _error.js and _app.js when starting, since they're always needed. All other pages are compiled with on demand entries
    // _document also has to be in the client compiler in development because we want to detect HMR changes and reload the client
    pages = await glob(`pages/+(_document|_app|_error).+(${pageExtensions})`, { cwd: dir })
  } else {
    // In production get all pages from the pages directory
    pages = await glob(isServer ? `pages/**/*.+(${pageExtensions})` : `pages/**/!(_document)*.+(${pageExtensions})`, { cwd: dir })
  }

  return pages
}

// Convert page path into single entry
export function createEntry (filePath, {name, pageExtensions} = {}) {
  const parsedPath = path.parse(filePath)
  let entryName = name || filePath

  // This makes sure we compile `pages/blog/index.js` to `pages/blog.js`.
  // Excludes `pages/index.js` from this rule since we do want `/` to route to `pages/index.js`
  if (parsedPath.dir !== 'pages' && parsedPath.name === 'index') {
    entryName = `${parsedPath.dir}.js`
  }

  // Makes sure supported extensions are stripped off. The outputted file should always be `.js`
  if (pageExtensions) {
    entryName = entryName.replace(new RegExp(`\\.+(${pageExtensions})$`), '.js')
  }

  return {
    name: path.join('bundles', entryName),
    files: [parsedPath.root ? filePath : `./${filePath}`] // The entry always has to be an array.
  }
}

// Convert page paths into entries
export function getPageEntries (pagePaths, {nextPagesDir, isServer = false, pageExtensions} = {}) {
  const entries = {}

  for (const filePath of pagePaths) {
    const entry = createEntry(filePath, {pageExtensions})
    entries[entry.name] = entry.files
  }

  const appPagePath = path.join(nextPagesDir, '_app.js')
  const appPageEntry = createEntry(appPagePath, {name: 'pages/_app.js'}) // default app.js
  if (!entries[appPageEntry.name]) {
    entries[appPageEntry.name] = appPageEntry.files
  }

  const errorPagePath = path.join(nextPagesDir, '_error.js')
  const errorPageEntry = createEntry(errorPagePath, {name: 'pages/_error.js'}) // default error.js
  if (!entries[errorPageEntry.name]) {
    entries[errorPageEntry.name] = errorPageEntry.files
  }

  if (isServer) {
    const documentPagePath = path.join(nextPagesDir, '_document.js')
    const documentPageEntry = createEntry(documentPagePath, {name: 'pages/_document.js'}) // default _document.js
    if (!entries[documentPageEntry.name]) {
      entries[documentPageEntry.name] = documentPageEntry.files
    }
  }

  return entries
}
