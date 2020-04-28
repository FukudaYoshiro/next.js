import {
  BUILD_MANIFEST,
  CLIENT_STATIC_FILES_PATH,
  REACT_LOADABLE_MANIFEST,
  SERVER_DIRECTORY,
} from '../lib/constants'
import { join } from 'path'
import { requirePage } from './require'
import { BuildManifest } from './get-page-files'
import { AppType, DocumentType } from '../lib/utils'
import {
  PageConfig,
  GetStaticPaths,
  GetServerSideProps,
  GetStaticProps,
} from 'next/types'

export function interopDefault(mod: any) {
  return mod.default || mod
}

export type ManifestItem = {
  id: number | string
  name: string
  file: string
  publicPath: string
}

type ReactLoadableManifest = { [moduleId: string]: ManifestItem[] }

export type LoadComponentsReturnType = {
  Component: React.ComponentType
  pageConfig?: PageConfig
  buildManifest: BuildManifest
  reactLoadableManifest: ReactLoadableManifest
  Document: DocumentType
  App: AppType
  getStaticProps?: GetStaticProps
  getStaticPaths?: GetStaticPaths
  getServerSideProps?: GetServerSideProps
}

export async function loadComponents(
  distDir: string,
  buildId: string,
  pathname: string,
  serverless: boolean
): Promise<LoadComponentsReturnType> {
  if (serverless) {
    const Component = await requirePage(pathname, distDir, serverless)
    const { getStaticProps, getStaticPaths, getServerSideProps } = Component

    return {
      Component,
      pageConfig: Component.config || {},
      getStaticProps,
      getStaticPaths,
      getServerSideProps,
    } as LoadComponentsReturnType
  }
  const documentPath = join(
    distDir,
    SERVER_DIRECTORY,
    CLIENT_STATIC_FILES_PATH,
    buildId,
    'pages',
    '_document'
  )
  const appPath = join(
    distDir,
    SERVER_DIRECTORY,
    CLIENT_STATIC_FILES_PATH,
    buildId,
    'pages',
    '_app'
  )

  const DocumentMod = require(documentPath)

  const AppMod = require(appPath)

  const ComponentMod = requirePage(pathname, distDir, serverless)

  const [
    buildManifest,
    reactLoadableManifest,
    Component,
    Document,
    App,
  ] = await Promise.all([
    require(join(distDir, BUILD_MANIFEST)),
    require(join(distDir, REACT_LOADABLE_MANIFEST)),
    interopDefault(ComponentMod),
    interopDefault(DocumentMod),
    interopDefault(AppMod),
  ])

  const { getServerSideProps, getStaticProps, getStaticPaths } = ComponentMod

  return {
    App,
    Document,
    Component,
    buildManifest,
    reactLoadableManifest,
    pageConfig: ComponentMod.config || {},
    getServerSideProps,
    getStaticProps,
    getStaticPaths,
  }
}
