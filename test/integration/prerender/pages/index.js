import Link from 'next/link'

export async function getStaticProps() {
  // throw new Error('oops from getStaticProps')
  return {
    props: { world: 'world', time: new Date().getTime() },
    // bad-prop
    revalidate: 1,
  }
}

const Page = ({ world, time }) => {
  return (
    <>
      {/* <div id='after-change'>idk</div> */}
      <p>hello {world}</p>
      <span>time: {time}</span>
      <Link href="/non-json/[p]" as="/non-json/1">
        <a id="non-json">to non-json</a>
      </Link>
      <br />
      <Link href="/another?hello=world" as="/another/?hello=world">
        <a id="another">to another</a>
      </Link>
      <br />
      <Link href="/something">
        <a id="something">to something</a>
      </Link>
      <br />
      <Link href="/normal">
        <a id="normal">to normal</a>
      </Link>
      <br />
      <Link href="/blog/[post]" as="/blog/post-1">
        <a id="post-1">to dynamic</a>
      </Link>
      <Link href="/blog/[post]" as="/blog/post-100">
        <a id="broken-post">to broken</a>
      </Link>
      <Link href="/blog/[post]" as="/blog/post-999" prefetch={false}>
        <a id="broken-at-first-post">to broken at first</a>
      </Link>
      <br />
      <Link href="/blog/[post]/[comment]" as="/blog/post-1/comment-1">
        <a id="comment-1">to another dynamic</a>
      </Link>
      <Link href="/catchall/[...slug]" as="/catchall/first">
        <a id="to-catchall">to catchall</a>
      </Link>
    </>
  )
}

export default Page
