# Example app with asset imports

This example shows how to enable the imports of assets (images, videos, etc.) and get a URL pointing to `/public`.

## Deploy your own

Deploy the example using [ZEIT Now](https://zeit.co/now):

[![Deploy with ZEIT Now](https://zeit.co/button)](https://zeit.co/import/project?template=https://github.com/zeit/next.js/tree/canary/examples/with-asset-imports)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-asset-imports with-asset-imports-app
# or
yarn create next-app --example with-asset-imports with-asset-imports-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-asset-imports
cd with-asset-imports
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

## Note

This is also configurable to point to a CDN changing the `baseUri` to the CDN domain, something similar to this:

```json
[
  "transform-assets-import-to-string",
  {
    "baseDir": "/",
    "baseUri": "https://cdn.domain.com"
  }
]
```
