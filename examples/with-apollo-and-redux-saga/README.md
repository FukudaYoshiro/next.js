# Apollo & Redux Saga Example

In 2.0.0, Apollo Client severs out-of-the-box support for redux in favor of Apollo's client side state management. This example aims to be an amalgamation of the [`with-apollo`](https://github.com/zeit/next.js/tree/master/examples/with-apollo) and [`with-redux-saga`](https://github.com/zeit/next.js/tree/master/examples/with-redux-saga) examples.

## How to use

### Using `create-next-app`

Execute [`create-next-app`](https://github.com/zeit/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init) or [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/) to bootstrap the example:

```bash
npm init next-app --example with-apollo-and-redux-saga with-apollo-and-redux-saga-app
# or
yarn create next-app --example with-apollo-and-redux-saga with-apollo-and-redux-saga-app
```

### Download manually

Download the example:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/canary | tar -xz --strip=2 next.js-canary/examples/with-apollo-and-redux-saga
cd with-apollo-and-redux-saga
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

### Note:

Note that you can access the redux store like you normally would using `react-redux`'s `connect`. Here's a quick example:

```js
const mapStateToProps = state => ({
  location: state.form.location,
})

export default withReduxSaga(connect(mapStateToProps, null)(Index))
```

`connect` must go inside `withReduxSaga` otherwise `connect` will not be able to find the store.

In these _with-apollo_ examples, the `withData()` HOC must wrap a top-level component from within the `pages` directory. Wrapping a child component with the HOC will result in a `Warning: Failed prop type: The prop 'serverState' is marked as required in 'WithData(Apollo(Component))', but its value is 'undefined'` error. Down-tree child components will have access to Apollo, and can be wrapped with any other sort of `graphql()`, `compose()`, etc HOC's.
