import React, { ReactElement, useEffect, useRef } from 'react'
import Head from '../next-server/lib/head'

const VALID_LOADING_VALUES = ['lazy', 'eager', undefined] as const
type LoadingValue = typeof VALID_LOADING_VALUES[number]

const loaders = new Map<LoaderKey, (props: LoaderProps) => string>([
  ['imgix', imgixLoader],
  ['cloudinary', cloudinaryLoader],
  ['akamai', akamaiLoader],
  ['default', defaultLoader],
])

type LoaderKey = 'imgix' | 'cloudinary' | 'akamai' | 'default'

const VALID_LAYOUT_VALUES = [
  'fill',
  'fixed',
  'intrinsic',
  'responsive',
  undefined,
] as const
type LayoutValue = typeof VALID_LAYOUT_VALUES[number]

type ImageData = {
  deviceSizes: number[]
  imageSizes: number[]
  loader: LoaderKey
  path: string
  domains?: string[]
}

type ImageProps = Omit<
  JSX.IntrinsicElements['img'],
  'src' | 'srcSet' | 'ref' | 'width' | 'height' | 'loading'
> & {
  src: string
  quality?: number | string
  priority?: boolean
  loading?: LoadingValue
  unoptimized?: boolean
} & (
    | {
        width?: never
        height?: never
        /** @deprecated Use `layout="fill"` instead */
        unsized: true
      }
    | { width?: never; height?: never; layout: 'fill' }
    | {
        width: number | string
        height: number | string
        layout?: Exclude<LayoutValue, 'fill'>
      }
  )

const imageData: ImageData = process.env.__NEXT_IMAGE_OPTS as any
const {
  deviceSizes: configDeviceSizes,
  imageSizes: configImageSizes,
  loader: configLoader,
  path: configPath,
  domains: configDomains,
} = imageData
// sort smallest to largest
configDeviceSizes.sort((a, b) => a - b)
configImageSizes.sort((a, b) => a - b)

let cachedObserver: IntersectionObserver

function getObserver(): IntersectionObserver | undefined {
  const IntersectionObserver =
    typeof window !== 'undefined' ? window.IntersectionObserver : null
  // Return shared instance of IntersectionObserver if already created
  if (cachedObserver) {
    return cachedObserver
  }

  // Only create shared IntersectionObserver if supported in browser
  if (!IntersectionObserver) {
    return undefined
  }
  return (cachedObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          let lazyImage = entry.target as HTMLImageElement
          unLazifyImage(lazyImage)
          cachedObserver.unobserve(lazyImage)
        }
      })
    },
    { rootMargin: '200px' }
  ))
}

function unLazifyImage(lazyImage: HTMLImageElement): void {
  if (lazyImage.dataset.src) {
    lazyImage.src = lazyImage.dataset.src
  }
  if (lazyImage.dataset.srcset) {
    lazyImage.srcset = lazyImage.dataset.srcset
  }
  lazyImage.style.visibility = 'visible'
  lazyImage.classList.remove('__lazy')
}

function getDeviceSizes(
  width: number | undefined,
  layout: LayoutValue
): number[] {
  if (
    typeof width !== 'number' ||
    layout === 'fill' ||
    layout === 'responsive'
  ) {
    return configDeviceSizes
  }
  if (configImageSizes.includes(width)) {
    return [width]
  }
  const widths: number[] = []
  for (let size of configDeviceSizes) {
    widths.push(size)
    if (size >= width) {
      break
    }
  }
  return widths
}

function computeSrc(
  src: string,
  unoptimized: boolean,
  layout: LayoutValue,
  width?: number,
  quality?: number
): string {
  if (unoptimized) {
    return src
  }
  const widths = getDeviceSizes(width, layout)
  const largest = widths[widths.length - 1]
  return callLoader({ src, width: largest, quality })
}

type CallLoaderProps = {
  src: string
  width: number
  quality?: number
}

function callLoader(loaderProps: CallLoaderProps) {
  const load = loaders.get(configLoader) || defaultLoader
  return load({ root: configPath, ...loaderProps })
}

type SrcSetData = {
  src: string
  unoptimized: boolean
  layout: LayoutValue
  width?: number
  quality?: number
}

function generateSrcSet({
  src,
  unoptimized,
  layout,
  width,
  quality,
}: SrcSetData): string | undefined {
  // At each breakpoint, generate an image url using the loader, such as:
  // ' www.example.com/foo.jpg?w=480 480w, '
  if (unoptimized) {
    return undefined
  }

  return getDeviceSizes(width, layout)
    .map((w) => `${callLoader({ src, width: w, quality })} ${w}w`)
    .join(', ')
}

type PreloadData = {
  src: string
  unoptimized: boolean
  layout: LayoutValue
  width: number | undefined
  sizes?: string
  quality?: number
}

function generatePreload({
  src,
  unoptimized = false,
  layout,
  width,
  sizes,
  quality,
}: PreloadData): ReactElement {
  // This function generates an image preload that makes use of the "imagesrcset" and "imagesizes"
  // attributes for preloading responsive images. They're still experimental, but fully backward
  // compatible, as the link tag includes all necessary attributes, even if the final two are ignored.
  // See: https://web.dev/preload-responsive-images/
  return (
    <Head>
      <link
        rel="preload"
        as="image"
        href={computeSrc(src, unoptimized, layout, width, quality)}
        // @ts-ignore: imagesrcset and imagesizes not yet in the link element type
        imagesrcset={generateSrcSet({
          src,
          unoptimized,
          layout,
          width,
          quality,
        })}
        imagesizes={sizes}
      />
    </Head>
  )
}

function getInt(x: unknown): number | undefined {
  if (typeof x === 'number') {
    return x
  }
  if (typeof x === 'string') {
    return parseInt(x, 10)
  }
  return undefined
}

export default function Image({
  src,
  sizes,
  unoptimized = false,
  priority = false,
  loading,
  className,
  quality,
  width,
  height,
  ...all
}: ImageProps) {
  const thisEl = useRef<HTMLImageElement>(null)

  let rest: Partial<ImageProps> = all
  let layout: NonNullable<LayoutValue> = sizes ? 'responsive' : 'intrinsic'
  let unsized = false
  if ('unsized' in rest) {
    unsized = Boolean(rest.unsized)
    // Remove property so it's not spread into image:
    delete rest['unsized']
  } else if ('layout' in rest) {
    // Override default layout if the user specified one:
    if (rest.layout) layout = rest.layout

    // Remove property so it's not spread into image:
    delete rest['layout']
  }

  if (process.env.NODE_ENV !== 'production') {
    if (!src) {
      throw new Error(
        `Image is missing required "src" property. Make sure you pass "src" in props to the \`next/image\` component. Received: ${JSON.stringify(
          { width, height, quality }
        )}`
      )
    }
    if (!VALID_LAYOUT_VALUES.includes(layout)) {
      throw new Error(
        `Image with src "${src}" has invalid "layout" property. Provided "${layout}" should be one of ${VALID_LAYOUT_VALUES.map(
          String
        ).join(',')}.`
      )
    }
    if (!VALID_LOADING_VALUES.includes(loading)) {
      throw new Error(
        `Image with src "${src}" has invalid "loading" property. Provided "${loading}" should be one of ${VALID_LOADING_VALUES.map(
          String
        ).join(',')}.`
      )
    }
    if (priority && loading === 'lazy') {
      throw new Error(
        `Image with src "${src}" has both "priority" and "loading='lazy'" properties. Only one should be used.`
      )
    }
    if (unsized) {
      throw new Error(
        `Image with src "${src}" has deprecated "unsized" property, which was removed in favor of the "layout='fill'" property`
      )
    }
  }

  let lazy = loading === 'lazy'
  if (!priority && typeof loading === 'undefined') {
    lazy = true
  }

  if (typeof window !== 'undefined' && !window.IntersectionObserver) {
    // Rendering client side on browser without intersection observer
    lazy = false
  }

  useEffect(() => {
    const target = thisEl.current

    if (target && lazy) {
      const observer = getObserver()

      if (observer) {
        observer.observe(target)

        return () => {
          observer.unobserve(target)
        }
      } else {
        //browsers without intersection observer
        unLazifyImage(target)
      }
    }
  }, [thisEl, lazy])

  const widthInt = getInt(width)
  const heightInt = getInt(height)
  const qualityInt = getInt(quality)

  let wrapperStyle: JSX.IntrinsicElements['div']['style'] | undefined
  let sizerStyle: JSX.IntrinsicElements['div']['style'] | undefined
  let sizerSvg: string | undefined
  let imgStyle: JSX.IntrinsicElements['img']['style'] = {
    visibility: lazy ? 'hidden' : 'visible',

    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,

    boxSizing: 'border-box',
    padding: 0,
    border: 'none',
    margin: 'auto',

    display: 'block',
    width: 0,
    height: 0,
    minWidth: '100%',
    maxWidth: '100%',
    minHeight: '100%',
    maxHeight: '100%',
  }
  if (
    typeof widthInt !== 'undefined' &&
    typeof heightInt !== 'undefined' &&
    layout !== 'fill'
  ) {
    // <Image src="i.png" width="100" height="100" />
    const quotient = heightInt / widthInt
    const paddingTop = isNaN(quotient) ? '100%' : `${quotient * 100}%`
    if (layout === 'responsive') {
      // <Image src="i.png" width="100" height="100" layout="responsive" />
      wrapperStyle = {
        display: 'block',
        overflow: 'hidden',
        position: 'relative',

        boxSizing: 'border-box',
        margin: 0,
      }
      sizerStyle = { display: 'block', boxSizing: 'border-box', paddingTop }
    } else if (layout === 'intrinsic') {
      // <Image src="i.png" width="100" height="100" layout="intrinsic" />
      wrapperStyle = {
        display: 'inline-block',
        maxWidth: '100%',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
        margin: 0,
      }
      sizerStyle = {
        boxSizing: 'border-box',
        display: 'block',
        maxWidth: '100%',
      }
      sizerSvg = `<svg width="${widthInt}" height="${heightInt}" xmlns="http://www.w3.org/2000/svg" version="1.1"/>`
    } else if (layout === 'fixed') {
      // <Image src="i.png" width="100" height="100" layout="fixed" />
      wrapperStyle = {
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'inline-block',
        position: 'relative',
        width: widthInt,
        height: heightInt,
      }
    }
  } else if (
    typeof widthInt === 'undefined' &&
    typeof heightInt === 'undefined' &&
    layout === 'fill'
  ) {
    // <Image src="i.png" layout="fill" />
    wrapperStyle = {
      display: 'block',
      overflow: 'hidden',

      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,

      boxSizing: 'border-box',
      margin: 0,
    }
  } else {
    // <Image src="i.png" />
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        `Image with src "${src}" must use "width" and "height" properties or "layout='fill'" property.`
      )
    }
  }

  // Generate attribute values
  const imgSrc = computeSrc(src, unoptimized, layout, widthInt, qualityInt)
  const imgSrcSet = generateSrcSet({
    src,
    unoptimized,
    layout,
    width: widthInt,
    quality: qualityInt,
  })

  let imgAttributes:
    | {
        src: string
        srcSet?: string
      }
    | {
        'data-src': string
        'data-srcset'?: string
      }
  if (!lazy) {
    imgAttributes = {
      src: imgSrc,
    }
    if (imgSrcSet) {
      imgAttributes.srcSet = imgSrcSet
    }
  } else {
    imgAttributes = {
      'data-src': imgSrc,
    }
    if (imgSrcSet) {
      imgAttributes['data-srcset'] = imgSrcSet
    }
    className = className ? className + ' __lazy' : '__lazy'
  }

  // No need to add preloads on the client side--by the time the application is hydrated,
  // it's too late for preloads
  const shouldPreload = priority && typeof window === 'undefined'

  if (unsized) {
    wrapperStyle = undefined
    sizerStyle = undefined
    imgStyle = undefined
  }
  return (
    <div style={wrapperStyle}>
      {shouldPreload
        ? generatePreload({
            src,
            layout,
            unoptimized,
            width: widthInt,
            sizes,
            quality: qualityInt,
          })
        : null}
      {sizerStyle ? (
        <div style={sizerStyle}>
          {sizerSvg ? (
            <img
              style={{ maxWidth: '100%', display: 'block' }}
              alt=""
              aria-hidden={true}
              role="presentation"
              src={`data:image/svg+xml;charset=utf-8,${sizerSvg}`}
            />
          ) : null}
        </div>
      ) : null}
      <img
        {...rest}
        {...imgAttributes}
        decoding="async"
        className={className}
        sizes={sizes}
        ref={thisEl}
        style={imgStyle}
      />
    </div>
  )
}

//BUILT IN LOADERS

type LoaderProps = CallLoaderProps & { root: string }

function normalizeSrc(src: string) {
  return src[0] === '/' ? src.slice(1) : src
}

function imgixLoader({ root, src, width, quality }: LoaderProps): string {
  const params = ['auto=format', 'w=' + width]
  let paramsString = ''
  if (quality) {
    params.push('q=' + quality)
  }

  if (params.length) {
    paramsString = '?' + params.join('&')
  }
  return `${root}${normalizeSrc(src)}${paramsString}`
}

function akamaiLoader({ root, src, width }: LoaderProps): string {
  return `${root}${normalizeSrc(src)}?imwidth=${width}`
}

function cloudinaryLoader({ root, src, width, quality }: LoaderProps): string {
  const params = ['f_auto', 'w_' + width]
  let paramsString = ''
  if (quality) {
    params.push('q_' + quality)
  }
  if (params.length) {
    paramsString = params.join(',') + '/'
  }
  return `${root}${paramsString}${normalizeSrc(src)}`
}

function defaultLoader({ root, src, width, quality }: LoaderProps): string {
  if (process.env.NODE_ENV !== 'production') {
    const missingValues = []

    // these should always be provided but make sure they are
    if (!src) missingValues.push('src')
    if (!width) missingValues.push('width')

    if (missingValues.length > 0) {
      throw new Error(
        `Next Image Optimization requires ${missingValues.join(
          ', '
        )} to be provided. Make sure you pass them as props to the \`next/image\` component. Received: ${JSON.stringify(
          { src, width, quality }
        )}`
      )
    }

    if (src && !src.startsWith('/') && configDomains) {
      let parsedSrc: URL
      try {
        parsedSrc = new URL(src)
      } catch (err) {
        console.error(err)
        throw new Error(
          `Failed to parse "${src}" in "next/image", if using relative image it must start with a leading slash "/" or be an absolute URL (http:// or https://)`
        )
      }

      if (!configDomains.includes(parsedSrc.hostname)) {
        throw new Error(
          `Invalid src prop (${src}) on \`next/image\`, hostname "${parsedSrc.hostname}" is not configured under images in your \`next.config.js\`\n` +
            `See more info: https://err.sh/nextjs/next-image-unconfigured-host`
        )
      }
    }
  }

  return `${root}?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`
}
