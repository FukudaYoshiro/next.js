# With react-toolbox example

This is a simple example of getting react-toolbox up and running, using [react-toolbox-themr](https://github.com/react-toolbox/react-toolbox-themr).

For actual use, you probably also want to add Roboto Font, and Material Design Icons. See <http://react-toolbox.io/#/install>

## Deploy your own

Deploy the example using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/vercel/next.js/tree/canary/examples/with-react-toolbox)

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npx create-next-app --example with-react-toolbox with-react-toolbox-app
# or
yarn create next-app --example with-react-toolbox with-react-toolbox-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/vercel/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-react-toolbox
cd with-react-toolbox
```

Install it and run:

```bash
npm install
npm run dev
# or
yarn
yarn dev
```

Notice that `yarn toolbox` (or `npm run toolbox`) should be rerun every time the `"reactToolbox"` configuration in `package.json` is changed, in order to update `/theme.js` and `public/theme.css`. The `"reactToolbox"` configuration includes styling, and the list of react-toolbox components to include.

Deploy it to the cloud with [Vercel](https://vercel.com/import?filter=next.js&utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).
