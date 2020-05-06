/* global jasmine */
/* eslint-env jest */
import { sandbox } from './helpers'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 5

test('logbox: can recover from a syntax error without losing state', async () => {
  const [session, cleanup] = await sandbox()

  await session.patch(
    'index.js',
    `
      import { useCallback, useState } from 'react'

      export default function Index() {
        const [count, setCount] = useState(0)
        const increment = useCallback(() => setCount(c => c + 1), [setCount])
        return (
          <main>
            <p>{count}</p>
            <button onClick={increment}>Increment</button>
          </main>
        )
      }
    `
  )

  await session.evaluate(() => document.querySelector('button').click())
  expect(
    await session.evaluate(() => document.querySelector('p').textContent)
  ).toBe('1')

  await session.patch('index.js', `export default () => <div/`)

  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatch('SyntaxError')

  await session.patch(
    'index.js',
    `
      import { useCallback, useState } from 'react'

      export default function Index() {
        const [count, setCount] = useState(0)
        const increment = useCallback(() => setCount(c => c + 1), [setCount])
        return (
          <main>
            <p>Count: {count}</p>
            <button onClick={increment}>Increment</button>
          </main>
        )
      }
    `
  )

  expect(
    await session.evaluate(() => document.querySelector('p').textContent)
  ).toBe('Count: 1')

  expect(await session.hasRedbox()).toBe(false)

  await cleanup()
})

test('logbox: can recover from a event handler error', async () => {
  const [session, cleanup] = await sandbox()

  await session.patch(
    'index.js',
    `
      import { useCallback, useState } from 'react'

      export default function Index() {
        const [count, setCount] = useState(0)
        const increment = useCallback(() => {
          setCount(c => c + 1)
          throw new Error('oops')
        }, [setCount])
        return (
          <main>
            <p>{count}</p>
            <button onClick={increment}>Increment</button>
          </main>
        )
      }
    `
  )

  expect(
    await session.evaluate(() => document.querySelector('p').textContent)
  ).toBe('0')
  await session.evaluate(() => document.querySelector('button').click())
  expect(
    await session.evaluate(() => document.querySelector('p').textContent)
  ).toBe('1')

  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
    "index.js (8:16) @ eval

       6 | const increment = useCallback(() => {
       7 |   setCount(c => c + 1)
    >  8 |   throw new Error('oops')
         |        ^
       9 | }, [setCount])
      10 | return (
      11 |   <main>"
  `)

  await session.patch(
    'index.js',
    `
      import { useCallback, useState } from 'react'

      export default function Index() {
        const [count, setCount] = useState(0)
        const increment = useCallback(() => setCount(c => c + 1), [setCount])
        return (
          <main>
            <p>Count: {count}</p>
            <button onClick={increment}>Increment</button>
          </main>
        )
      }
    `
  )

  expect(await session.hasRedbox()).toBe(false)

  expect(
    await session.evaluate(() => document.querySelector('p').textContent)
  ).toBe('Count: 1')
  await session.evaluate(() => document.querySelector('button').click())
  expect(
    await session.evaluate(() => document.querySelector('p').textContent)
  ).toBe('Count: 2')

  expect(await session.hasRedbox()).toBe(false)

  await cleanup()
})

test('logbox: can recover from a component error', async () => {
  const [session, cleanup] = await sandbox()

  await session.write(
    'child.js',
    `
      export default function Child() {
        return <p>Hello</p>;
      }
    `
  )

  await session.patch(
    'index.js',
    `
      import Child from './child'

      export default function Index() {
        return (
          <main>
            <Child />
          </main>
        )
      }
    `
  )

  expect(
    await session.evaluate(() => document.querySelector('p').textContent)
  ).toBe('Hello')

  await session.patch(
    'child.js',
    `
      // hello
      export default function Child() {
        throw new Error('oops')
      }
    `
  )

  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
    "child.js (4:14) @ Child

      2 |   // hello
      3 |   export default function Child() {
    > 4 |     throw new Error('oops')
        |          ^
      5 |   }
      6 | "
  `)

  const didNotReload = await session.patch(
    'child.js',
    `
      export default function Child() {
        return <p>Hello</p>;
      }
    `
  )

  expect(didNotReload).toBe(true)
  expect(await session.hasRedbox()).toBe(false)
  expect(
    await session.evaluate(() => document.querySelector('p').textContent)
  ).toBe('Hello')

  await cleanup()
})

// https://github.com/pmmmwh/react-refresh-webpack-plugin/pull/3#issuecomment-554137262
test('render error not shown right after syntax error', async () => {
  const [session, cleanup] = await sandbox()

  // Starting here:
  await session.patch(
    'index.js',
    `
      class ClassDefault extends React.Component {
        render() {
          return <h1>Default Export</h1>;
        }
      }

      export default ClassDefault;
    `
  )

  expect(
    await session.evaluate(() => document.querySelector('h1').textContent)
  ).toBe('Default Export')

  // Break it with a syntax error:
  await session.patch(
    'index.js',
    `
      import * as React from 'react';

      class ClassDefault extends React.Component {
        render()
          return <h1>Default Export</h1>;
        }
      }

      export default ClassDefault;
    `
  )
  expect(await session.hasRedbox(true)).toBe(true)

  // Now change the code to introduce a runtime error without fixing the syntax error:
  await session.patch(
    'index.js',
    `
      import * as React from 'react';

      class ClassDefault extends React.Component {
        render()
          throw new Error('nooo');
          return <h1>Default Export</h1>;
        }
      }

      export default ClassDefault;
    `
  )
  expect(await session.hasRedbox(true)).toBe(true)

  // Now fix the syntax error:
  await session.patch(
    'index.js',
    `
      import * as React from 'react';

      class ClassDefault extends React.Component {
        render() {
          throw new Error('nooo');
          return <h1>Default Export</h1>;
        }
      }

      export default ClassDefault;
    `
  )
  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
    "index.js (6:16) @ ClassDefault.render

      4 | class ClassDefault extends React.Component {
      5 |   render() {
    > 6 |     throw new Error('nooo');
        |          ^
      7 |     return <h1>Default Export</h1>;
      8 |   }
      9 | }"
  `)

  await cleanup()
})

// https://github.com/pmmmwh/react-refresh-webpack-plugin/pull/3#issuecomment-554137807
test('module init error not shown', async () => {
  // Start here:
  const [session, cleanup] = await sandbox()

  // We start here.
  await session.patch(
    'index.js',
    `
      import * as React from 'react';
      class ClassDefault extends React.Component {
        render() {
          return <h1>Default Export</h1>;
        }
      }
      export default ClassDefault;
    `
  )

  expect(
    await session.evaluate(() => document.querySelector('h1').textContent)
  ).toBe('Default Export')

  // Add a throw in module init phase:
  await session.patch(
    'index.js',
    `
      // top offset for snapshot
      import * as React from 'react';
      throw new Error('no')
      class ClassDefault extends React.Component {
        render() {
          return <h1>Default Export</h1>;
        }
      }
      export default ClassDefault;
    `
  )

  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
    "index.js (4:12) @ Module../index.js

      2 | // top offset for snapshot
      3 | import * as React from 'react';
    > 4 | throw new Error('no')
        |      ^
      5 | class ClassDefault extends React.Component {
      6 |   render() {
      7 |     return <h1>Default Export</h1>;"
  `)

  await cleanup()
})

// https://github.com/pmmmwh/react-refresh-webpack-plugin/pull/3#issuecomment-554144016
test('stuck error', async () => {
  const [session, cleanup] = await sandbox()

  // We start here.
  await session.patch(
    'index.js',
    `
      import * as React from 'react';

      function FunctionDefault() {
        return <h1>Default Export Function</h1>;
      }

      export default FunctionDefault;
    `
  )

  // We add a new file. Let's call it Foo.js.
  await session.write(
    'Foo.js',
    `
      // intentionally skips export
      export default function Foo() {
        return React.createElement('h1', null, 'Foo');
      }
    `
  )

  // We edit our first file to use it.
  await session.patch(
    'index.js',
    `
      import * as React from 'react';
      import Foo from './Foo';
      function FunctionDefault() {
        return <Foo />;
      }
      export default FunctionDefault;
    `
  )

  // We get an error because Foo didn't import React. Fair.
  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
    "Foo.js (4:8) @ Foo

      2 |   // intentionally skips export
      3 |   export default function Foo() {
    > 4 |     return React.createElement('h1', null, 'Foo');
        |    ^
      5 |   }
      6 | "
  `)

  // Let's add that to Foo.
  await session.patch(
    'Foo.js',
    `
      import * as React from 'react';
      export default function Foo() {
        return React.createElement('h1', null, 'Foo');
      }
    `
  )

  // Expected: this fixes the problem
  expect(await session.hasRedbox()).toBe(false)

  await cleanup()
})

// https://github.com/pmmmwh/react-refresh-webpack-plugin/pull/3#issuecomment-554150098
test('syntax > runtime error', async () => {
  const [session, cleanup] = await sandbox()

  // Start here.
  await session.patch(
    'index.js',
    `
      import * as React from 'react';

      export default function FunctionNamed() {
        return <div />
      }
    `
  )
  // TODO: this acts weird without above step
  await session.patch(
    'index.js',
    `
      import * as React from 'react';
      let i = 0
      setInterval(() => {
        i++
        throw Error('no ' + i)
      }, 1000)
      export default function FunctionNamed() {
        return <div />
      }
    `
  )

  await new Promise(resolve => setTimeout(resolve, 1000))
  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
    "index.js (6:14) @ eval

      4 | setInterval(() => {
      5 |   i++
    > 6 |   throw Error('no ' + i)
        |        ^
      7 | }, 1000)
      8 | export default function FunctionNamed() {
      9 |   return <div />"
  `)

  // Make a syntax error.
  await session.patch(
    'index.js',
    `
      import * as React from 'react';
      let i = 0
      setInterval(() => {
        i++
        throw Error('no ' + i)
      }, 1000)
      export default function FunctionNamed() {
    `
  )

  await new Promise(resolve => setTimeout(resolve, 1000))
  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatch('SyntaxError')

  // Test that runtime error does not take over:
  await new Promise(resolve => setTimeout(resolve, 2000))
  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatch('SyntaxError')

  await cleanup()
})

// https://github.com/pmmmwh/react-refresh-webpack-plugin/pull/3#issuecomment-554152127
test('boundaries', async () => {
  const [session, cleanup] = await sandbox()

  await session.write(
    'FunctionDefault.js',
    `
      export default function FunctionDefault() {
        return <h2>hello</h2>
      }
    `
  )
  await session.patch(
    'index.js',
    `
      import FunctionDefault from './FunctionDefault.js'
      class ErrorBoundary extends React.Component {
        constructor() {
          super()
          this.state = { hasError: false, error: null };
        }
        static getDerivedStateFromError(error) {
          return {
            hasError: true,
            error
          };
        }
        render() {
          if (this.state.hasError) {
            return this.props.fallback;
          }
          return this.props.children;
        }
      }
      function App() {
        return (
          <ErrorBoundary fallback={<h2>error</h2>}>
            <FunctionDefault />
          </ErrorBoundary>
        );
      }
      export default App;
    `
  )

  expect(
    await session.evaluate(() => document.querySelector('h2').textContent)
  ).toBe('hello')

  await session.write(
    'FunctionDefault.js',
    `export default function FunctionDefault() { throw new Error('no'); }`
  )

  expect(await session.hasRedbox(true)).toBe(true)
  expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
    "FunctionDefault.js (1:50) @ FunctionDefault

    > 1 | export default function FunctionDefault() { throw new Error('no'); }
        |                                                  ^"
  `)
  expect(
    await session.evaluate(() => document.querySelector('h2').textContent)
  ).toBe('error')

  await cleanup()
})
