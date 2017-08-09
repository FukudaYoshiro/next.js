[![Deploy to now](https://deploy.now.sh/static/button.svg)](https://deploy.now.sh/?repo=https://github.com/zeit/next.js/tree/master/examples/with-algolia-react-instantsearch)

# With Algolia React InstantSearch example

## How to use

Download the example [or clone the repo](https://github.com/zeit/next.js):

```bash
curl https://codeload.github.com/zeit/next.js/tar.gz/master | tar -xz --strip=2 next.js-master/examples/with-algolia-react-instantsearch
cd with-algolia-react-instantsearch
```

Set up Algolia:
- create an [algolia](https://www.algolia.com/) account or use this already [configured index](https://community.algolia.com/react-instantsearch/Getting_started.html#before-we-start)
- update the appId, apikey and indexName you want to search on in components/app.js

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
The goal of this example is to illustrate how you can use [Algolia React InstantSearch](https://community.algolia.com/react-instantsearch/) to perform
your search with a Server-rendered application developed with Next.js. It also illustrates how you 
can keep in sync the Url with the search. 
