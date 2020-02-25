# Custom server example

The HTTP/1.1 specification says - if charset is not set in the http header then the browser defaults use ISO-8859-1.
For languages like Polish, Albanian, Hungarian, Czech, Slovak, Slovene, there will be broken characters encoding from SSR.

You can overwrite Content-Type in getInitialProps. But if you want to handle it as a server side concern, you can use this as an simple example.

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example custom-charset custom-charset-app
# or
yarn create next-app --example custom-charset custom-charset-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/custom-charset
cd custom-charset
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
