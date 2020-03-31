# with-route-as-modal

On many popular social media, opening a post will update the URL but won't trigger a navigation and will instead display the content inside a modal. This behavior ensure the user won't lose the current UI context (scroll position). The URL still reflect the post's actual page location and any refresh will bring the user there. This behavior ensure great UX without neglecting SEO.

This example show how to conditionally display a modal based on a route.

## Deploy your own

Deploy the example using [ZEIT Now](https://zeit.co/now):

[![Deploy with ZEIT Now](https://zeit.co/button)](https://zeit.co/import/project?template=https://github.com/zeit/next.js/tree/canary/examples/with-route-as-modal)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npx create-next-app --example with-route-as-modal with-route-as-modal-app
# or
yarn create next-app --example with-route-as-modal with-route-as-modal-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-route-as-modal
cd with-route-as-modal
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
