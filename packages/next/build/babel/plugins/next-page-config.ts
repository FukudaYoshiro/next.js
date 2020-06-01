import { NodePath, PluginObj, types as BabelTypes } from '@babel/core'
import { PageConfig } from 'next/types'

const STRING_LITERAL_DROP_BUNDLE = '__NEXT_DROP_CLIENT_FILE__'

// replace program path with just a variable with the drop identifier
function replaceBundle(path: any, t: typeof BabelTypes): void {
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

function errorMessage(state: any, details: string): string {
  const pageName =
    (state.filename || '').split(state.cwd || '').pop() || 'unknown'
  return `Invalid page config export found. ${details} in file ${pageName}. See: https://err.sh/vercel/next.js/invalid-page-config`
}

interface ConfigState {
  bundleDropped?: boolean
}

// config to parsing pageConfig for client bundles
export default function nextPageConfig({
  types: t,
}: {
  types: typeof BabelTypes
}): PluginObj {
  return {
    visitor: {
      Program: {
        enter(path, state: ConfigState) {
          path.traverse(
            {
              ExportNamedDeclaration(
                exportPath: NodePath<BabelTypes.ExportNamedDeclaration>,
                exportState: any
              ) {
                if (exportState.bundleDropped || !exportPath.node.declaration) {
                  return
                }

                if (
                  !BabelTypes.isVariableDeclaration(exportPath.node.declaration)
                ) {
                  return
                }

                const { declarations } = exportPath.node.declaration
                const config: PageConfig = {}

                for (const declaration of declarations) {
                  if (
                    !BabelTypes.isIdentifier(declaration.id, { name: 'config' })
                  ) {
                    continue
                  }

                  if (!BabelTypes.isObjectExpression(declaration.init)) {
                    const got = declaration.init
                      ? declaration.init.type
                      : 'undefined'
                    throw new Error(
                      errorMessage(
                        exportState,
                        `Expected object but got ${got}`
                      )
                    )
                  }

                  for (const prop of declaration.init.properties) {
                    if (BabelTypes.isSpreadElement(prop)) {
                      throw new Error(
                        errorMessage(
                          exportState,
                          `Property spread is not allowed`
                        )
                      )
                    }
                    const { name } = prop.key
                    if (BabelTypes.isIdentifier(prop.key, { name: 'amp' })) {
                      if (!BabelTypes.isObjectProperty(prop)) {
                        throw new Error(
                          errorMessage(
                            exportState,
                            `Invalid property "${name}"`
                          )
                        )
                      }
                      if (
                        !BabelTypes.isBooleanLiteral(prop.value) &&
                        !BabelTypes.isStringLiteral(prop.value)
                      ) {
                        throw new Error(
                          errorMessage(
                            exportState,
                            `Invalid value for "${name}"`
                          )
                        )
                      }
                      config.amp = prop.value.value as PageConfig['amp']
                    }
                  }
                }

                if (config.amp === true) {
                  if (!exportState.file?.opts?.caller.isDev) {
                    // don't replace bundle in development so HMR can track
                    // dependencies and trigger reload when they are changed
                    replaceBundle(exportPath, t)
                  }
                  exportState.bundleDropped = true
                  return
                }
              },
            },
            state
          )
        },
      },
    },
  }
}
