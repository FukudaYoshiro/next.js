# With Dotenv example

This example shows how to inline env vars.

## Deploy your own

Deploy the example using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/vercel/next.js/tree/canary/examples/with-dotenv)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-dotenv with-dotenv-app
# or
yarn create next-app --example with-dotenv with-dotenv-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/vercel/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-dotenv
cd with-dotenv
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

## Note

- It is a bad practice to commit env vars to a repository. Thats why you should normally [gitignore](https://git-scm.com/docs/gitignore) your `.env` file.
- In this example, as soon as you reference an env var in your code, it will automatically be made publicly available and exposed to the client.
- If you want to have more centralized control of what is exposed to the client check out the example [with-universal-configuration-build-time](../with-universal-configuration-build-time).
- Env vars are set (inlined) at build time. If you need to configure your app at runtime, check out [examples/with-universal-configuration-runtime](../with-universal-configuration-runtime).
