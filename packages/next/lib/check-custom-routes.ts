import * as pathToRegexp from 'path-to-regexp'
import {
  PERMANENT_REDIRECT_STATUS,
  TEMPORARY_REDIRECT_STATUS,
} from '../next-server/lib/constants'

export type Rewrite = {
  source: string
  destination: string
}

export type Redirect = Rewrite & {
  statusCode?: number
  permanent?: boolean
}

export type Header = {
  source: string
  headers: Array<{ key: string; value: string }>
}

const allowedStatusCodes = new Set([301, 302, 303, 307, 308])

export function getRedirectStatus(route: Redirect) {
  return (
    route.statusCode ||
    (route.permanent ? PERMANENT_REDIRECT_STATUS : TEMPORARY_REDIRECT_STATUS)
  )
}

function checkRedirect(route: Redirect) {
  const invalidParts: string[] = []
  let hadInvalidStatus: boolean = false

  if (route.statusCode && !allowedStatusCodes.has(route.statusCode)) {
    hadInvalidStatus = true
    invalidParts.push(`\`statusCode\` is not undefined or valid statusCode`)
  }
  if (typeof route.permanent !== 'boolean' && !route.statusCode) {
    invalidParts.push(`\`permanent\` is not set to \`true\` or \`false\``)
  }

  return {
    invalidParts,
    hadInvalidStatus,
  }
}

function checkHeader(route: Header) {
  const invalidParts: string[] = []

  if (!Array.isArray(route.headers)) {
    invalidParts.push('`headers` field must be an array')
  } else {
    for (const header of route.headers) {
      if (!header || typeof header !== 'object') {
        invalidParts.push(
          "`headers` items must be object with { key: '', value: '' }"
        )
        break
      }
      if (typeof header.key !== 'string') {
        invalidParts.push('`key` in header item must be string')
        break
      }
      if (typeof header.value !== 'string') {
        invalidParts.push('`value` in header item must be string')
        break
      }
    }
  }
  return invalidParts
}

export type RouteType = 'rewrite' | 'redirect' | 'header'

export default function checkCustomRoutes(
  routes: Redirect[] | Header[] | Rewrite[],
  type: RouteType
): void {
  if (!Array.isArray(routes)) {
    throw new Error(
      `${type}s must return an array, received ${typeof routes}.\n` +
        `See here for more info: https://err.sh/next.js/routes-must-be-array`
    )
  }

  let numInvalidRoutes = 0
  let hadInvalidStatus = false

  const isRedirect = type === 'redirect'
  let allowedKeys: Set<string>

  if (type === 'rewrite' || isRedirect) {
    allowedKeys = new Set([
      'source',
      'destination',
      ...(isRedirect ? ['statusCode', 'permanent'] : []),
    ])
  } else {
    allowedKeys = new Set(['source', 'headers'])
  }

  for (const route of routes) {
    if (!route || typeof route !== 'object') {
      console.error(
        `The route ${JSON.stringify(
          route
        )} is not a valid object with \`source\` and \`${
          type === 'header' ? 'headers' : 'destination'
        }\``
      )
      numInvalidRoutes++
      continue
    }

    const keys = Object.keys(route)
    const invalidKeys = keys.filter(key => !allowedKeys.has(key))
    const invalidParts: string[] = []

    if (!route.source) {
      invalidParts.push('`source` is missing')
    } else if (typeof route.source !== 'string') {
      invalidParts.push('`source` is not a string')
    } else if (!route.source.startsWith('/')) {
      invalidParts.push('`source` does not start with /')
    }

    if (type === 'header') {
      invalidParts.push(...checkHeader(route as Header))
    } else {
      let _route = route as Rewrite | Redirect
      if (!_route.destination) {
        invalidParts.push('`destination` is missing')
      } else if (typeof _route.destination !== 'string') {
        invalidParts.push('`destination` is not a string')
      } else if (
        type === 'rewrite' &&
        !_route.destination.match(/^(\/|https:\/\/|http:\/\/)/)
      ) {
        invalidParts.push(
          '`destination` does not start with `/`, `http://`, or `https://`'
        )
      }
    }

    if (type === 'redirect') {
      const result = checkRedirect(route as Redirect)
      hadInvalidStatus = hadInvalidStatus || result.hadInvalidStatus
      invalidParts.push(...result.invalidParts)
    }

    let sourceTokens: pathToRegexp.Token[] | undefined

    if (typeof route.source === 'string' && route.source.startsWith('/')) {
      // only show parse error if we didn't already show error
      // for not being a string
      try {
        // Make sure we can parse the source properly
        sourceTokens = pathToRegexp.parse(route.source)
        pathToRegexp.tokensToRegexp(sourceTokens)
      } catch (err) {
        // If there is an error show our err.sh but still show original error or a formatted one if we can
        const errMatches = err.message.match(/at (\d{0,})/)

        if (errMatches) {
          const position = parseInt(errMatches[1], 10)
          console.error(
            `\nError parsing \`${route.source}\` ` +
              `https://err.sh/zeit/next.js/invalid-route-source\n` +
              `Reason: ${err.message}\n\n` +
              `  ${route.source}\n` +
              `  ${new Array(position).fill(' ').join('')}^\n`
          )
        } else {
          console.error(
            `\nError parsing ${route.source} https://err.sh/zeit/next.js/invalid-route-source`,
            err
          )
        }
        invalidParts.push('`source` parse failed')
      }
    }

    // make sure no unnamed patterns are attempted to be used in the
    // destination as this can cause confusion and is not allowed
    if (typeof (route as Rewrite).destination === 'string') {
      if (
        (route as Rewrite).destination.startsWith('/') &&
        Array.isArray(sourceTokens)
      ) {
        const unnamedInDest = new Set()

        for (const token of sourceTokens) {
          if (typeof token === 'object' && typeof token.name === 'number') {
            const unnamedIndex = `:${token.name}`
            if ((route as Rewrite).destination.includes(unnamedIndex)) {
              unnamedInDest.add(unnamedIndex)
            }
          }
        }

        if (unnamedInDest.size > 0) {
          invalidParts.push(
            `\`destination\` has unnamed params ${[...unnamedInDest].join(
              ', '
            )}`
          )
        }
      }
    }

    const hasInvalidKeys = invalidKeys.length > 0
    const hasInvalidParts = invalidParts.length > 0

    if (hasInvalidKeys || hasInvalidParts) {
      console.error(
        `${invalidParts.join(', ')}${
          invalidKeys.length
            ? (hasInvalidParts ? ',' : '') +
              ` invalid field${invalidKeys.length === 1 ? '' : 's'}: ` +
              invalidKeys.join(',')
            : ''
        } for route ${JSON.stringify(route)}`
      )
      numInvalidRoutes++
    }
  }

  if (numInvalidRoutes > 0) {
    if (hadInvalidStatus) {
      console.error(
        `\nValid redirect statusCode values are ${[...allowedStatusCodes].join(
          ', '
        )}`
      )
    }
    console.error()

    throw new Error(`Invalid ${type}${numInvalidRoutes === 1 ? '' : 's'} found`)
  }
}
