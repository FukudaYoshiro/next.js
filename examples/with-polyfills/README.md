# Example app with polyfills

Next.js supports browsers from IE10 to the latest. It adds polyfills as they need. But Next.js cannot add polyfills for code inside NPM modules. So sometimes, you need to add polyfills by yourself.

This how you can do it easily with Next.js's custom webpack config feature.

## Deploy your own

Deploy the example using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/vercel/next.js/tree/canary/examples/with-polyfills)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-polyfills with-polyfills-app
# or
yarn create next-app --example with-polyfills with-polyfills-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/vercel/next.js/tar.gz/master | tar -xz --strip=2 next.js-master/examples/with-polyfills
cd with-polyfills
```

Install it and run:

```bash
npm install
npm run dev
# or
yarn
yarn dev
```

Deploy it to the cloud with [Vercel](https://vercel.com/import?filter=next.js&utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).
