import {
  Compiler,
  Template,
  // @ts-ignore exists in webpack 5
  RuntimeModule,
  // @ts-ignore exists in webpack 5
  RuntimeGlobals,
  version,
} from 'webpack'

function webpack4(compiler: Compiler) {
  // Webpack 4 does not have a method to handle interception of module
  // execution.
  // The closest thing we have to emulating this is mimicking the behavior of
  // `strictModuleExceptionHandling` in `MainTemplate`:
  // https://github.com/webpack/webpack/blob/4c644bf1f7cb067c748a52614500e0e2182b2700/lib/MainTemplate.js#L200

  compiler.hooks.compilation.tap('ReactFreshWebpackPlugin', (compilation) => {
    const hookRequire: typeof compilation['mainTemplate']['hooks']['requireExtensions'] = (compilation
      .mainTemplate.hooks as any).require

    hookRequire.tap('ReactFreshWebpackPlugin', (source, _chunk, _hash) => {
      // Webpack 4 evaluates module code on the following line:
      // ```
      // modules[moduleId].call(module.exports, module, module.exports, hotCreateRequire(moduleId));
      // ```
      // https://github.com/webpack/webpack/blob/4c644bf1f7cb067c748a52614500e0e2182b2700/lib/MainTemplate.js#L200

      const lines = source.split('\n')
      const evalIndex = lines.findIndex((l) =>
        l.includes('modules[moduleId].call(')
      )
      // Unable to find the module execution, that's OK:
      if (evalIndex === -1) {
        return source
      }

      // Legacy CSS implementations will `eval` browser code in a Node.js
      // context to extract CSS. For backwards compatibility, we need to check
      // we're in a browser context before continuing.
      return Template.asString([
        ...lines.slice(0, evalIndex),
        `
        var hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
        var cleanup = hasRefresh
          ? self.$RefreshInterceptModuleExecution$(moduleId)
          : function() {};
        try {
        `,
        lines[evalIndex],
        `
        } finally {
          cleanup();
        }
        `,
        ...lines.slice(evalIndex + 1),
      ])
    })
  })
}

function webpack5(compiler: Compiler) {
  class ReactRefreshRuntimeModule extends RuntimeModule {
    constructor() {
      super('react refresh', 5)
    }

    generate() {
      // @ts-ignore This exists in webpack 5
      const { runtimeTemplate } = this.compilation
      return Template.asString([
        `${
          RuntimeGlobals.interceptModuleExecution
        }.push(${runtimeTemplate.basicFunction('options', [
          `${
            runtimeTemplate.supportsConst() ? 'const' : 'var'
          } originalFactory = options.factory;`,
          `options.factory = ${runtimeTemplate.basicFunction(
            'moduleObject, moduleExports, webpackRequire',
            [
              // Legacy CSS implementations will `eval` browser code in a Node.js
              // context to extract CSS. For backwards compatibility, we need to check
              // we're in a browser context before continuing.
              `${
                runtimeTemplate.supportsConst() ? 'const' : 'var'
              } hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;`,
              `${
                runtimeTemplate.supportsConst() ? 'const' : 'var'
              } cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : ${
                runtimeTemplate.supportsArrowFunction()
                  ? '() => {}'
                  : 'function() {}'
              };`,
              'try {',
              Template.indent(
                'originalFactory.call(this, moduleObject, moduleExports, webpackRequire);'
              ),
              '} finally {',
              Template.indent(`cleanup();`),
              '}',
            ]
          )}`,
        ])})`,
      ])
    }
  }

  compiler.hooks.compilation.tap('ReactFreshWebpackPlugin', (compilation) => {
    // @ts-ignore Exists in webpack 5
    compilation.hooks.additionalTreeRuntimeRequirements.tap(
      'ReactFreshWebpackPlugin',
      (chunk: any) => {
        // @ts-ignore Exists in webpack 5
        compilation.addRuntimeModule(chunk, new ReactRefreshRuntimeModule())
      }
    )
  })
}

class ReactFreshWebpackPlugin {
  apply(compiler: Compiler) {
    const webpackMajorVersion = parseInt(version ?? '', 10)

    switch (webpackMajorVersion) {
      case 4: {
        webpack4(compiler)
        break
      }
      case 5: {
        webpack5(compiler)
        break
      }
      default: {
        throw new Error(
          `ReactFreshWebpackPlugin does not support webpack v${webpackMajorVersion}.`
        )
      }
    }
  }
}

export default ReactFreshWebpackPlugin
