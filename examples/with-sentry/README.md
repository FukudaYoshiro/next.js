# Sentry example

An example showing use of [Sentry](https://sentry.io) to catch & report errors on both client + server side.

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-sentry with-sentry-app
# or
yarn create next-app --example with-sentry with-sentry-app
```

### Download manually

Download the example:

Install it and run:

**npm**

```bash
npm install
npm run dev
```

**yarn**

```bash
yarn
yarn dev
```

Deploy it to the cloud with [Vercel](https://vercel.com/import?filter=next.js&utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).

### Configuration

You will need a _Sentry DSN_ for your project. You can get it from the Settings of your Project, in **Client Keys (DSN)**, and copy the string labeled **DSN (Public)**.

The Sentry DSN should then be added as an environment variable when running the `dev`, `build`, and `start` scripts in `package.json`:

```bash
{
  "scripts": {
    "dev": "SENTRY_DSN=<dsn> node server.js",
    "build": "SENTRY_DSN=<dsn> next build",
    "start": "SENTRY_DSN=<dsn> NODE_ENV=production node server.js"
  }
}
```

_Note: Setting environment variables in a `package.json` is not secure, it is done here only for demo purposes. See the [`with-dotenv`](../with-dotenv) example for an example of how to set environment variables safely._
