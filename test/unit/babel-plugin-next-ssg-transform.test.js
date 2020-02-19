/* eslint-env jest */
import { transform } from '@babel/core'

const trim = s =>
  s
    .join('\n')
    .trim()
    .replace(/^\s+/gm, '')

// avoid generating __source annotations in JSX during testing:
const NODE_ENV = process.env.NODE_ENV
process.env.NODE_ENV = 'production'
const plugin = require('next/dist/build/babel/plugins/next-ssg-transform')
process.env.NODE_ENV = NODE_ENV

const babel = (code, esm = true, pluginOptions = {}) =>
  transform(code, {
    filename: 'noop.js',
    presets: [['@babel/preset-react', { development: false, pragma: '__jsx' }]],
    plugins: [[plugin, pluginOptions]],
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    compact: true,
    caller: {
      name: 'tests',
      supportsStaticESM: esm,
    },
  }).code

describe('babel plugin (next-ssg-transform)', () => {
  describe('getStaticProps support', () => {
    it('should remove separate named export specifiers', () => {
      const output = babel(trim`
        export { unstable_getStaticPaths } from '.'
        export { a as unstable_getStaticProps } from '.'

        export default function Test() {
          return <div />
        }
      `)
      expect(output).toMatchInlineSnapshot(
        `"var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should remove combined named export specifiers', () => {
      const output = babel(trim`
        export { unstable_getStaticPaths, a as unstable_getStaticProps } from '.'

        export default function Test() {
          return <div />
        }
      `)
      expect(output).toMatchInlineSnapshot(
        `"var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should retain extra named export specifiers', () => {
      const output = babel(trim`
        export { unstable_getStaticPaths, a as unstable_getStaticProps, foo, bar as baz } from '.'

        export default function Test() {
          return <div />
        }
      `)
      expect(output).toMatchInlineSnapshot(
        `"export{foo,bar as baz}from'.';var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should remove named export function declarations', () => {
      const output = babel(trim`
        export function unstable_getStaticPaths() {
          return []
        }

        export function unstable_getStaticProps() {
          return { props: {} }
        }

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should remove named export function declarations (async)', () => {
      const output = babel(trim`
        export async function unstable_getStaticPaths() {
          return []
        }

        export async function unstable_getStaticProps() {
          return { props: {} }
        }

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should not remove extra named export function declarations', () => {
      const output = babel(trim`
        export function unstable_getStaticProps() {
          return { props: {} }
        }

        export function Noop() {}

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"export function Noop(){}var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should remove named export variable declarations', () => {
      const output = babel(trim`
        export const unstable_getStaticPaths = () => {
          return []
        }

        export const unstable_getStaticProps = function() {
          return { props: {} }
        }

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should remove named export variable declarations (async)', () => {
      const output = babel(trim`
        export const unstable_getStaticPaths = async () => {
          return []
        }

        export const unstable_getStaticProps = async function() {
          return { props: {} }
        }

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should not remove extra named export variable declarations', () => {
      const output = babel(trim`
        export const unstable_getStaticPaths = () => {
          return []
        }, foo = 2

        export const unstable_getStaticProps = function() {
          return { props: {} }
        }

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"export const foo=2;var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should remove re-exported variable declarations', () => {
      const output = babel(trim`
        const unstable_getStaticPaths = () => {
          return []
        }

        export { unstable_getStaticPaths }

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should remove re-exported variable declarations (safe)', () => {
      const output = babel(trim`
        const unstable_getStaticPaths = () => {
          return []
        }, a = 2

        export { unstable_getStaticPaths }

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"const a=2;var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should remove re-exported function declarations', () => {
      const output = babel(trim`
        function unstable_getStaticPaths() {
          return []
        }

        export { unstable_getStaticPaths }

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should not crash for class declarations', () => {
      const output = babel(trim`
        function unstable_getStaticPaths() {
          return []
        }

        export { unstable_getStaticPaths }

        export class MyClass {}

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"export class MyClass{}var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it(`should remove re-exported function declarations' dependents (variables, functions, imports)`, () => {
      const output = babel(trim`
        import keep_me from 'hello'
        import {keep_me2} from 'hello2'
        import * as keep_me3 from 'hello3'

        import drop_me from 'bla'
        import { drop_me2 } from 'foo'
        import { drop_me3, but_not_me } from 'bar'
        import * as remove_mua from 'hehe'

        var leave_me_alone = 1;
        function dont_bug_me_either() {}

        const inceptionVar = 'hahaa';
        var var1 = 1;
        let var2 = 2;
        const var3 = inceptionVar + remove_mua;

        function inception1() {var2;drop_me2;}

        function abc() {}
        const b = function() {var3;drop_me3;};
        const b2 = function apples() {};
        const bla = () => {inception1};

        function unstable_getStaticProps() {
          abc();
          drop_me;
          b;
          b2;
          bla();
          return { props: {var1} }
        }

        export { unstable_getStaticProps }

        export default function Test() {
          return <div />
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"import keep_me from'hello';import{keep_me2}from'hello2';import*as keep_me3 from'hello3';import{but_not_me}from'bar';var leave_me_alone=1;function dont_bug_me_either(){}var __NEXT_COMP=function Test(){return __jsx(\\"div\\",null);};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should not mix up bindings', () => {
      const output = babel(trim`
        function Function1() {
          return {
            a: function bug(a) {
              return 2;
            }
          };
        }

        function Function2() {
          var bug = 1;
          return { bug };
        }

        export { unstable_getStaticProps } from 'a'
      `)

      expect(output).toMatchInlineSnapshot(
        `"function Function1(){return{a:function bug(a){return 2;}};}function Function2(){var bug=1;return{bug};}"`
      )
    })

    it('should support class exports', () => {
      const output = babel(trim`
        export function unstable_getStaticProps() {
          return { props: {} }
        }

        export default class Test extends React.Component {
          render() {
            return <div />
          }
        }
      `)

      expect(output).toMatchInlineSnapshot(
        `"var __NEXT_COMP=class Test extends React.Component{render(){return __jsx(\\"div\\",null);}};__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should support class exports 2', () => {
      const output = babel(trim`
        export function unstable_getStaticProps() {
          return { props: {} }
        }

        class Test extends React.Component {
          render() {
            return <div />
          }
        }

        export default Test;
      `)

      expect(output).toMatchInlineSnapshot(
        `"class Test extends React.Component{render(){return __jsx(\\"div\\",null);}}var __NEXT_COMP=Test;__NEXT_COMP.__N_SSG=true export default __NEXT_COMP;"`
      )
    })

    it('should support export { _ as default }', () => {
      const output = babel(trim`
        export function unstable_getStaticProps() {
          return { props: {} }
        }

        function El() {
          return <div />
        }

        export { El as default }
      `)

      expect(output).toMatchInlineSnapshot(
        `"function El(){return __jsx(\\"div\\",null);}El.__N_SSG=true export{El as default};"`
      )
    })

    it('should support export { _ as default } with other specifiers', () => {
      const output = babel(trim`
        export function unstable_getStaticProps() {
          return { props: {} }
        }

        function El() {
          return <div />
        }

        const a = 5

        export { El as default, a }
      `)

      expect(output).toMatchInlineSnapshot(
        `"function El(){return __jsx(\\"div\\",null);}const a=5;El.__N_SSG=true export{El as default,a};"`
      )
    })

    it('should support export { _ as default } with a class', () => {
      const output = babel(trim`
        export function unstable_getStaticProps() {
          return { props: {} }
        }

        class El extends React.Component {
          render() {
            return <div />
          }
        }

        const a = 5

        export { El as default, a }
      `)

      expect(output).toMatchInlineSnapshot(
        `"class El extends React.Component{render(){return __jsx(\\"div\\",null);}}const a=5;El.__N_SSG=true export{El as default,a};"`
      )
    })
  })
})
