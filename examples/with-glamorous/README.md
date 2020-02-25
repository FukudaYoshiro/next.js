# Example app with [glamorous](https://github.com/kentcdodds/glamorous)

> Glamorous is no longer maintained. Choose styled-components or emotion instead

This example features how to use [glamorous](https://github.com/kentcdodds/glamorous) as the styling solution instead of [styled-jsx](https://github.com/zeit/styled-jsx). It also incorporates [glamor](https://github.com/threepointone/glamor) since `glamor` is a dependency for `glamorous`.

We are creating three `div` elements with custom styles being shared across the elements. The styles includes the use of pseudo-elements and CSS animations.

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-glamorous with-glamorous-app
# or
yarn create next-app --example with-glamorous with-glamorous-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-glamorous
cd with-glamorous
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
