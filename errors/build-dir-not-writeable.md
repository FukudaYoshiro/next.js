# Build directory not writeable

#### Why This Error Occurred

The filesystem does not allow writing to the specified directory. A common cause for this error is starting a [custom server](https://github.com/zeit/next.js#custom-server-and-routing) in development mode on a production server, for example, [now.sh](https://zeit.co) which [doesn't allow you to write to the filesystem after your app is built](https://zeit.co/docs/deployment-types/node#file-system-specifications).

#### Possible Ways to Fix It

When using a custom server with a server file, for example called `server.js`, make sure you update the scripts key in `package.json` to:

```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

and the custom server starts Next in production mode when `NODE_ENV` is `production`

```js
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
```

### Useful Links

- [Custom Server documentation + examples](https://github.com/zeit/next.js#custom-server-and-routing)
