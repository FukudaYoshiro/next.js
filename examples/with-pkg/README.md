# Example with pkg

## How to use

Download the example [or clone the repo](https://github.com/zeit/next.js):

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/master | tar -xz --strip=2 next.js-master/examples/with-pkg
cd with-pkg
```

Install it and run:

```bash
npm install
npm run dev
```

Deploy it to the cloud with [now](https://zeit.co/now) ([download](https://zeit.co/download))

```bash
now
```

## The idea behind the example

This example demostrate how you can use [pkg](https://github.com/zeit/pkg) to create a binary version of a Next.js application.

To do it we need to create at least a super simple custom server that allow us to run `node server.js` instead of `next` or `next start`. We also need to create a `index.js` that works as the entry point for **pkg**, in that file we force to set NODE_ENV as production.
