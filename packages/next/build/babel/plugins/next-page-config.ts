import { NodePath, PluginObj } from '@babel/core'
import * as BabelTypes from '@babel/types'

import { PageConfig } from '../../../types'

const configKeys = new Set(['amp'])
const pageComponentVar = '__NEXT_COMP'
// this value can't be optimized by terser so the shorter the better
const prerenderId = '__NEXT_SPR'
export const EXPORT_NAME_GET_STATIC_PROPS = 'unstable_getStaticProps'
const EXPORT_NAME_GET_STATIC_PATHS = 'unstable_getStaticPaths'
const STRING_LITERAL_DROP_BUNDLE = '__NEXT_DROP_CLIENT_FILE__'

// replace program path with just a variable with the drop identifier
function replaceBundle(path: any, t: typeof BabelTypes) {
  path.parentPath.replaceWith(
    t.program(
      [
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('config'),
            t.assignmentExpression(
              '=',
              t.identifier(STRING_LITERAL_DROP_BUNDLE),
              t.stringLiteral(`${STRING_LITERAL_DROP_BUNDLE} ${Date.now()}`)
            )
          ),
        ]),
      ],
      []
    )
  )
}

interface ConfigState {
  isPrerender?: boolean
  bundleDropped?: boolean
  defaultExportUpdated?: boolean
}

// config to parsing pageConfig for client bundles
export default function nextPageConfig({
  types: t,
  traverse,
}: {
  types: typeof BabelTypes
  traverse: any
}): PluginObj {
  return {
    visitor: {
      Program: {
        enter(path, state: ConfigState) {
          path.traverse(
            {
              ExportNamedDeclaration(
                path: NodePath<BabelTypes.ExportNamedDeclaration>,
                state: any
              ) {
                if (
                  state.bundleDropped ||
                  !(path.node.declaration || path.node.specifiers.length)
                ) {
                  return
                }

                if (path.node.specifiers.length) {
                  const { specifiers } = path.node
                  specifiers.forEach(specifier => {
                    if (specifier.type !== 'ExportSpecifier') {
                      return
                    }

                    if (
                      specifier.exported.name ===
                        EXPORT_NAME_GET_STATIC_PROPS ||
                      specifier.exported.name === EXPORT_NAME_GET_STATIC_PATHS
                    ) {
                      if (
                        specifier.exported.name === EXPORT_NAME_GET_STATIC_PROPS
                      ) {
                        state.isPrerender = true
                      }
                      path.node.specifiers = path.node.specifiers.filter(
                        s => s !== specifier
                      )
                      return
                    }
                  })
                  if (path.node.specifiers.length === 0) {
                    path.remove()
                  }
                  return
                }

                const { declarations, id } = path.node.declaration as any
                const config: PageConfig = {}

                // drop SSR Exports for client bundles
                if (
                  id &&
                  (id.name === EXPORT_NAME_GET_STATIC_PROPS ||
                    id.name === EXPORT_NAME_GET_STATIC_PATHS)
                ) {
                  if (id.name === EXPORT_NAME_GET_STATIC_PROPS) {
                    state.isPrerender = true
                  }
                  path.remove()
                  return
                }

                if (!declarations) {
                  return
                }
                for (const declaration of declarations) {
                  if (declaration.id.name !== 'config') {
                    continue
                  }

                  if (declaration.init.type !== 'ObjectExpression') {
                    const pageName =
                      (state.filename || '').split(state.cwd || '').pop() ||
                      'unknown'

                    throw new Error(
                      `Invalid page config export found. Expected object but got ${declaration.init.type} in file ${pageName}. See: https://err.sh/zeit/next.js/invalid-page-config`
                    )
                  }

                  for (const prop of declaration.init.properties) {
                    const { name } = prop.key
                    if (configKeys.has(name)) {
                      // @ts-ignore
                      config[name] = prop.value.value
                    }
                  }
                }

                if (config.amp === true) {
                  replaceBundle(path, t)
                  state.bundleDropped = true
                  return
                }
              },
            },
            state
          )

          if (!state.bundleDropped && state.isPrerender) {
            // After we delete a bunch of code, we need to re-compute the scope.
            // This is necessary for later code elimination.
            traverse.cache.clear()
            ;(path.scope as any).crawl()
          }
        },
      },
      ExportDefaultDeclaration(path, state: ConfigState) {
        if (!state.isPrerender || state.defaultExportUpdated) {
          return
        }
        const prev = t.cloneDeep(path.node.declaration)

        // workaround to allow assigning a ClassDeclaration to a variable
        // babel throws error without
        if (prev.type.endsWith('Declaration')) {
          prev.type = prev.type.replace(/Declaration$/, 'Expression') as any
        }

        // @ts-ignore invalid return type
        const [pageCompPath] = path.replaceWithMultiple([
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(pageComponentVar), prev as any),
          ]),
          t.assignmentExpression(
            '=',
            t.memberExpression(
              t.identifier(pageComponentVar),
              t.identifier(prerenderId)
            ),
            t.booleanLiteral(true)
          ),
          t.exportDefaultDeclaration(t.identifier(pageComponentVar)),
        ])
        path.scope.registerDeclaration(pageCompPath)
        state.defaultExportUpdated = true
      },
    },
  }
}
