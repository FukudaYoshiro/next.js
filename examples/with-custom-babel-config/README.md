# Example app using custom babel config

Download the example (or clone the repo)[https://github.com/zeit/next.js.git]:

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/master | tar -xz --strip=2 next.js-master/examples/with-custom-babel-config
cd with-custom-babel-config
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

This example features:

* An app using proposed [do expressions](https://babeljs.io/docs/plugins/transform-do-expressions/).
* It uses babel-preset-stage-0, which allows us to use above JavaScript feature.

## How to run it

```sh
npm install
npm run dev
```
