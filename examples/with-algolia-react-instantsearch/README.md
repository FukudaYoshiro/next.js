# With Algolia React InstantSearch example

The goal of this example is to illustrate how you can use [Algolia React InstantSearch](https://community.algolia.com/react-instantsearch/) to perform your search with a Server-rendered application developed with Next.js. It also illustrates how you can keep in sync the Url with the search.

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-algolia-react-instantsearch with-algolia-react-instantsearch-app
# or
yarn create next-app --example with-algolia-react-instantsearch with-algolia-react-instantsearch-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/vercel/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-algolia-react-instantsearch
cd with-algolia-react-instantsearch
```

Set up Algolia:

- create an [algolia](https://www.algolia.com/) account or use this already [configured index](https://community.algolia.com/react-instantsearch/Getting_started.html#before-we-start)
- update the appId, apikey and indexName you want to search on in components/app.js

Install it and run:

```bash
npm install
npm run dev
# or
yarn
yarn dev
```

Deploy it to the cloud with [Vercel](https://vercel.com/import?filter=next.js&utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).
