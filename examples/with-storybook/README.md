# Example app with Storybook

This example shows a default set up of Storybook. Also included in the example is a custom component included in both Storybook and the Next.js application.

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-storybook with-storybook-app
# or
yarn create next-app --example with-storybook with-storybook-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-storybook
cd with-storybook
```

Install it and run:

```bash
npm install
npm run dev
# or
yarn
yarn dev
```

## Run Storybook

```bash
npm run storybook
# or
yarn storybook
```

## Build Static Storybook

```bash
npm run build-storybook
# or
yarn build-storybook
```

You can use [ZEIT Now](https://zeit.co/new?filter=next.js&utm_source=github&utm_medium=readme&utm_campaign=next-example) to deploy Storybook. Specify `storybook-static` as the output directory.
