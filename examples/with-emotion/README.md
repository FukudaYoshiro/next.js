# Pass Server Data Directly to a Next.js Page during SSR

Extract and inline critical css with
[emotion](https://github.com/emotion-js/emotion/tree/master/packages/emotion),
[emotion-server](https://github.com/emotion-js/emotion/tree/master/packages/emotion-server),
[@emotion/core](https://github.com/emotion-js/emotion/tree/master/packages/core),
and [@emotion/styled](https://github.com/emotion-js/emotion/tree/master/packages/styled).

## Deploy your own

Deploy the example using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/vercel/next.js/tree/canary/examples/with-emotion-10)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-emotion-10 with-emotion-10-app
# or
yarn create next-app --example with-emotion-10 with-emotion-10-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/master | tar -xz --strip=2 next.js-master/examples/with-emotion-10
cd with-emotion-10
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
