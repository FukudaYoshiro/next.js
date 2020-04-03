import { join } from 'path'
export const NEXT_PROJECT_ROOT = join(__dirname, '..', '..')
export const NEXT_PROJECT_ROOT_DIST = join(NEXT_PROJECT_ROOT, 'dist')
export const NEXT_PROJECT_ROOT_NODE_MODULES = join(
  NEXT_PROJECT_ROOT,
  'node_modules'
)
export const NEXT_PROJECT_ROOT_DIST_CLIENT = join(
  NEXT_PROJECT_ROOT_DIST,
  'client'
)
export const NEXT_PROJECT_ROOT_DIST_SERVER = join(
  NEXT_PROJECT_ROOT_DIST,
  'server'
)

// Regex for API routes
export const API_ROUTE = /^\/api(?:\/|$)/

// Because on Windows absolute paths in the generated code can break because of numbers, eg 1 in the path,
// we have to use a private alias
export const PAGES_DIR_ALIAS = 'private-next-pages'
export const DOT_NEXT_ALIAS = 'private-dot-next'

export const PUBLIC_DIR_MIDDLEWARE_CONFLICT = `You can not have a '_next' folder inside of your public folder. This conflicts with the internal '/_next' route. https://err.sh/zeit/next.js/public-next-folder-conflict`

export const SSG_GET_INITIAL_PROPS_CONFLICT = `You can not use getInitialProps with getStaticProps. To use SSG, please remove your getInitialProps`

export const SERVER_PROPS_GET_INIT_PROPS_CONFLICT = `You can not use getInitialProps with getServerSideProps. Please remove getInitialProps.`

export const SERVER_PROPS_SSG_CONFLICT = `You can not use getStaticProps with getServerSideProps. To use SSG, please remove getServerSideProps`

export const PAGES_404_GET_INITIAL_PROPS_ERROR = `\`pages/404\` can not have getInitialProps/getServerSideProps, https://err.sh/next.js/404-get-initial-props`

export const SERVER_PROPS_EXPORT_ERROR = `pages with \`getServerSideProps\` can not be exported. See more info here: https://err.sh/next.js/gss-export`

export const UNSTABLE_REVALIDATE_RENAME_ERROR =
  'The `revalidate` property is not yet available for general use.\n' +
  'To try the experimental implementation, please use `unstable_revalidate` instead.\n' +
  "We're excited for you to try this feature—please share all feedback on the RFC:\n" +
  'https://nextjs.link/issg'

export const GSSP_COMPONENT_MEMBER_ERROR = `can not be attached to a page's component and must be exported from the page. See more info here: https://err.sh/next.js/gssp-component-member`
