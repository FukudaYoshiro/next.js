# WebAssembly example

This example shows how to import WebAssembly files (`.wasm`) and use them inside of a React component that is server rendered. So the WebAssembly code is executed on the server too. In the case of this example we're showing Rust compiled to WebAssembly.

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npx create-next-app --example with-webassembly with-webassembly-app
# or
yarn create next-app --example with-webassembly with-webassembly-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/vercel/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-webassembly
cd with-webassembly
```

Install it and run:

This example uses Rust compiled to wasm, the wasm file is included in the example, but to compile your own Rust code you'll have to [install](https://www.rust-lang.org/learn/get-started) Rust.

```bash
npm install
npm run dev
# or
yarn
yarn dev
```

To compile `src/add.rs` to `add.wasm` use `npm run build-rust`.

Deploy it to the cloud with [Vercel](https://vercel.com/import?filter=next.js&utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).
