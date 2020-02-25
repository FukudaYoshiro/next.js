# Example app with Grommet

This example shows how to use the [Grommet UI library](https://grommet.io/) with Next.js.

It works by extending the `<Document />` to enable server-side rendering of `styled-components`, which are used by Grommet, and extending `<App />` to provide a Grommet context (and optionally a theme) for all child pages and components.

## Deploy your own

Deploy the example using [ZEIT Now](https://zeit.co/now):

[![Deploy with ZEIT Now](https://zeit.co/button)](https://zeit.co/import/project?template=https://github.com/zeit/next.js/tree/canary/examples/with-grommet)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-grommet with-grommet-app
# or
yarn create next-app --example with-grommet with-grommet-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-grommet
cd with-grommet
```

Install it and run:

```bash
npm install
npm run dev
# or
yarn
yarn dev
```

Deploy it to the cloud with [ZEIT Now](https://zeit.co/import?filter=next.js&utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).

### Try it on CodeSandbox

[Open this example on CodeSandbox](https://codesandbox.io/s/github/zeit/next.js/tree/canary/examples/with-grommet)
