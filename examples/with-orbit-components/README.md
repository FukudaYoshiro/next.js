# Example app with styled-components

[Orbit-components](https://orbit.kiwi) is a React component library which provides developers with the easiest possible way of building Kiwi.com’s products.

For this purpose we are extending `<App />` of injected `<ThemeProvider/>`, and also adding `@kiwicom/babel-plugin-orbit-components`.

This fork comes from [styled-components-example](https://github.com/zeit/next.js/tree/canary/examples/with-styled-components).

## Deploy your own

Deploy the example using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/zeit/next.js/tree/canary/examples/with-orbit-components)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-orbit-components with-orbit-components-app
# or
yarn create next-app --example with-orbit-components with-orbit-components-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-orbit-components
cd with-orbit-components
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
