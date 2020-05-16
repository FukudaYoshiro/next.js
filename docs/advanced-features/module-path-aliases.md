---
description: Configure module path aliases that allow you to remap certain import paths.
---

# Absolute Imports and Module path aliases

Next.js automatically supports the `tsconfig.json` and `jsconfig.json` `"paths"` and `"baseUrl"` options.

> Note: `jsconfig.json` can be used when you don't use TypeScript

These option allow you to configure module aliases, for example a common pattern is aliasing certain directories to use absolute paths.

One useful feature of these options is that they integrate automatically into certain editors, for example vscode.

The `baseUrl` configuration option allows you to import directly from the root of the project.

An example of this configuration:

```json
// tsconfig.json or jsconfig.json
{
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

```jsx
// components/button.js
export default function Button() {
  return <button>Click me</button>
}
```

```jsx
// pages/index.js
import Button from 'components/button'

export default function HomePage() {
  return (
    <>
      <h1>Hello World</h1>
      <Button />
    </>
  )
}
```

While `baseUrl` is useful you might want to add other aliases that don't match 1 on 1. For this TypeScript has the `"paths"` option.

Using `"paths"` allows you to configure module aliases. For example `@/components/*` to `components/*`.

An example of this configuration:

```json
// tsconfig.json or jsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/components/*": ["components/*"]
    }
  }
}
```

```jsx
// components/button.js
export default function Button() {
  return <button>Click me</button>
}
```

```jsx
// pages/index.js
import Button from '@/components/button'

export default function HomePage() {
  return (
    <>
      <h1>Hello World</h1>
      <Button />
    </>
  )
}
```
