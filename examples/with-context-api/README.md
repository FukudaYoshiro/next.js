# Hello World example

This example shows how to use react context api in our app.

It provides an example of using `pages/_app.js` to include the context api provider and then shows how both the `pages/index.js` and `pages/about.js` can both share the same data using the context api consumer.

We start of by creating two contexts. One that actually never changes (`CounterDispatchContext`) and one that changes more often (`CounterStateContext`).

The `pages/index.js` shows how to, from the home page, increment and decrement the context data by 1 (a hard code value in the context provider itself).

The `pages/about.js` shows how to pass an increment value from the about page into the context provider itself.

## Deploy your own

Deploy the example using [ZEIT Now](https://zeit.co/now):

[![Deploy with ZEIT Now](https://zeit.co/button)](https://zeit.co/import/project?template=https://github.com/zeit/next.js/tree/canary/examples/with-context-api)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-context-api with-context-api-app
# or
yarn create next-app --example with-context-api with-context-api-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-context-api
cd with-context-api
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
