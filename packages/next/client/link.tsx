declare const __NEXT_DATA__: any

import React, { Children, Component } from 'react'
import { parse, resolve, UrlObject } from 'url'
import { PrefetchOptions } from '../next-server/lib/router/router'
import {
  execOnce,
  formatWithValidation,
  getLocationOrigin,
} from '../next-server/lib/utils'
import Router from './router'
import { addBasePath } from '../next-server/lib/router/router'

function isLocal(href: string): boolean {
  const url = parse(href, false, true)
  const origin = parse(getLocationOrigin(), false, true)

  return (
    !url.host || (url.protocol === origin.protocol && url.host === origin.host)
  )
}

type Url = string | UrlObject
type FormatResult = { href: string; as?: string }

function memoizedFormatUrl(formatFunc: (href: Url, as?: Url) => FormatResult) {
  let lastHref: null | Url = null
  let lastAs: undefined | null | Url = null
  let lastResult: null | FormatResult = null
  return (href: Url, as?: Url) => {
    if (lastResult && href === lastHref && as === lastAs) {
      return lastResult
    }

    const result = formatFunc(href, as)
    lastHref = href
    lastAs = as
    lastResult = result
    return result
  }
}

function formatUrl(url: Url): string {
  return url && typeof url === 'object' ? formatWithValidation(url) : url
}

export type LinkProps = {
  href: Url
  as?: Url
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
  passHref?: boolean
  prefetch?: boolean
}

let observer: IntersectionObserver
const listeners = new Map<Element, () => void>()
const IntersectionObserver =
  typeof window !== 'undefined' ? window.IntersectionObserver : null
const prefetched: { [cacheKey: string]: boolean } = {}

function getObserver(): IntersectionObserver | undefined {
  // Return shared instance of IntersectionObserver if already created
  if (observer) {
    return observer
  }

  // Only create shared IntersectionObserver if supported in browser
  if (!IntersectionObserver) {
    return undefined
  }

  return (observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!listeners.has(entry.target)) {
          return
        }

        const cb = listeners.get(entry.target)!
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          observer.unobserve(entry.target)
          listeners.delete(entry.target)
          cb()
        }
      })
    },
    { rootMargin: '200px' }
  ))
}

const listenToIntersections = (el: Element, cb: () => void) => {
  const observer = getObserver()
  if (!observer) {
    return () => {}
  }

  observer.observe(el)
  listeners.set(el, cb)
  return () => {
    try {
      observer.unobserve(el)
    } catch (err) {
      console.error(err)
    }
    listeners.delete(el)
  }
}

class Link extends Component<LinkProps> {
  p: boolean

  constructor(props: LinkProps) {
    super(props)
    if (process.env.NODE_ENV !== 'production') {
      if (props.prefetch) {
        console.warn(
          'Next.js auto-prefetches automatically based on viewport. The prefetch attribute is no longer needed. More: https://err.sh/zeit/next.js/prefetch-true-deprecated'
        )
      }
    }
    this.p = props.prefetch !== false
  }

  cleanUpListeners = () => {}

  componentWillUnmount(): void {
    this.cleanUpListeners()
  }

  getPaths(): string[] {
    const { pathname } = window.location
    const { href: parsedHref, as: parsedAs } = this.formatUrls(
      this.props.href,
      this.props.as
    )
    const resolvedHref = resolve(pathname, parsedHref)
    return [resolvedHref, parsedAs ? resolve(pathname, parsedAs) : resolvedHref]
  }

  handleRef(ref: Element): void {
    if (this.p && IntersectionObserver && ref && ref.tagName) {
      this.cleanUpListeners()

      const isPrefetched =
        prefetched[
          this.getPaths().join(
            // Join on an invalid URI character
            '%'
          )
        ]
      if (!isPrefetched) {
        this.cleanUpListeners = listenToIntersections(ref, () => {
          this.prefetch()
        })
      }
    }
  }

  // The function is memoized so that no extra lifecycles are needed
  // as per https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
  formatUrls = memoizedFormatUrl((href, asHref) => {
    return {
      href: addBasePath(formatUrl(href)),
      as: asHref ? addBasePath(formatUrl(asHref)) : asHref,
    }
  })

  linkClicked = (e: React.MouseEvent): void => {
    const { nodeName, target } = e.currentTarget as HTMLAnchorElement
    if (
      nodeName === 'A' &&
      ((target && target !== '_self') ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        (e.nativeEvent && e.nativeEvent.which === 2))
    ) {
      // ignore click for new tab / new window behavior
      return
    }

    let { href, as } = this.formatUrls(this.props.href, this.props.as)

    if (!isLocal(href)) {
      // ignore click if it's outside our scope (e.g. https://google.com)
      return
    }

    const { pathname } = window.location
    href = resolve(pathname, href)
    as = as ? resolve(pathname, as) : href

    e.preventDefault()

    //  avoid scroll for urls with anchor refs
    let { scroll } = this.props
    if (scroll == null) {
      scroll = as.indexOf('#') < 0
    }

    // replace state instead of push if prop is present
    Router[this.props.replace ? 'replace' : 'push'](href, as, {
      shallow: this.props.shallow,
    }).then((success: boolean) => {
      if (!success) return
      if (scroll) {
        window.scrollTo(0, 0)
        document.body.focus()
      }
    })
  }

  prefetch(options?: PrefetchOptions): void {
    if (!this.p || typeof window === 'undefined') return
    // Prefetch the JSON page if asked (only in the client)
    const paths = this.getPaths()
    // We need to handle a prefetch error here since we may be
    // loading with priority which can reject but we don't
    // want to force navigation since this is only a prefetch
    Router.prefetch(paths[/* href */ 0], paths[/* asPath */ 1], options).catch(
      (err) => {
        if (process.env.NODE_ENV !== 'production') {
          // rethrow to show invalid URL errors
          throw err
        }
      }
    )
    prefetched[
      paths.join(
        // Join on an invalid URI character
        '%'
      )
    ] = true
  }

  render() {
    let { children } = this.props
    const { href, as } = this.formatUrls(this.props.href, this.props.as)
    // Deprecated. Warning shown by propType check. If the children provided is a string (<Link>example</Link>) we wrap it in an <a> tag
    if (typeof children === 'string') {
      children = <a>{children}</a>
    }

    // This will return the first child, if multiple are provided it will throw an error
    const child: any = Children.only(children)
    const props: {
      onMouseEnter: React.MouseEventHandler
      onClick: React.MouseEventHandler
      href?: string
      ref?: any
    } = {
      ref: (el: any) => {
        this.handleRef(el)

        if (child && typeof child === 'object' && child.ref) {
          if (typeof child.ref === 'function') child.ref(el)
          else if (typeof child.ref === 'object') {
            child.ref.current = el
          }
        }
      },
      onMouseEnter: (e: React.MouseEvent) => {
        if (child.props && typeof child.props.onMouseEnter === 'function') {
          child.props.onMouseEnter(e)
        }
        this.prefetch({ priority: true })
      },
      onClick: (e: React.MouseEvent) => {
        if (child.props && typeof child.props.onClick === 'function') {
          child.props.onClick(e)
        }
        if (!e.defaultPrevented) {
          this.linkClicked(e)
        }
      },
    }

    // If child is an <a> tag and doesn't have a href attribute, or if the 'passHref' property is
    // defined, we specify the current 'href', so that repetition is not needed by the user
    if (
      this.props.passHref ||
      (child.type === 'a' && !('href' in child.props))
    ) {
      props.href = as || href
    }

    // Add the ending slash to the paths. So, we can serve the
    // "<page>/index.html" directly.
    if (process.env.__NEXT_EXPORT_TRAILING_SLASH) {
      const rewriteUrlForNextExport = require('../next-server/lib/router/rewrite-url-for-export')
        .rewriteUrlForNextExport
      if (
        props.href &&
        typeof __NEXT_DATA__ !== 'undefined' &&
        __NEXT_DATA__.nextExport
      ) {
        props.href = rewriteUrlForNextExport(props.href)
      }
    }

    return React.cloneElement(child, props)
  }
}

if (process.env.NODE_ENV === 'development') {
  const warn = execOnce(console.error)

  // This module gets removed by webpack.IgnorePlugin
  const PropTypes = require('prop-types')
  const exact = require('prop-types-exact')
  // @ts-ignore the property is supported, when declaring it on the class it outputs an extra bit of code which is not needed.
  Link.propTypes = exact({
    href: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    as: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    prefetch: PropTypes.bool,
    replace: PropTypes.bool,
    shallow: PropTypes.bool,
    passHref: PropTypes.bool,
    scroll: PropTypes.bool,
    children: PropTypes.oneOfType([
      PropTypes.element,
      (props: any, propName: string) => {
        const value = props[propName]

        if (typeof value === 'string') {
          warn(
            `Warning: You're using a string directly inside <Link>. This usage has been deprecated. Please add an <a> tag as child of <Link>`
          )
        }

        return null
      },
    ]).isRequired,
  })
}

export default Link
