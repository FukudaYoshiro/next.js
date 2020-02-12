# With Lingui example

This example shows a way to use [lingui.js](https://lingui.js.org) with next.js.

It adds a webpack loader for the messages to avoid having to manually compile while developing as well as adds the compile step to the `next build` script for production builds.

The example also uses a Higher order Component which can be added to all pages which will be translated and that checks for a `?lang` query string switch the language. Next.js will dynamically load in the messages for the locale when navigating using a Next.js `<Link />` component.

## Deploy your own

Deploy the example using [ZEIT Now](https://zeit.co/now):

[![Deploy with ZEIT Now](https://zeit.co/button)](https://zeit.co/new/project?template=https://github.com/zeit/next.js/tree/canary/examples/with-lingui)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-lingui with-lingui-app
# or
yarn create next-app --example with-lingui with-lingui-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-lingui
cd with-lingui
```

Install it and run:

```bash
npm install
npm run dev
# or
yarn
yarn dev
```

Deploy it to the cloud with [ZEIT Now](https://zeit.co/new?filter=next.js&utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).

### How to add more translated strings

To add new strings use the [react component](https://lingui.js.org/tutorials/react-patterns.html#common-i18n-patterns-in-react) `<Trans />` and then run `yarn export` to export the messages into `locale/{language}/messages.po`.

### How to add another language

To add another language simply run `yarn add-locale <locale ...>` and it will create a new locale in the `locale/messages/` directory.
