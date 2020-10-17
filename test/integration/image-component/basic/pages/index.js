import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

const Page = () => {
  return (
    <div>
      <p>Hello World</p>
      <Image id="basic-image" src="foo.jpg"></Image>
      <Image id="attribute-test" data-demo="demo-value" src="bar.jpg" />
      <Image
        id="secondary-image"
        data-demo="demo-value"
        host="secondary"
        src="foo2.jpg"
      />
      <Image
        id="unoptimized-image"
        unoptimized
        src="https://arbitraryurl.com/foo.jpg"
      />
      <Image id="priority-image" priority src="withpriority.png" />
      <Image
        id="priority-image"
        priority
        host="secondary"
        src="withpriority2.png"
      />
      <Image
        id="priority-image"
        priority
        unoptimized
        src="https://arbitraryurl.com/withpriority3.png"
      />
      <Image id="preceding-slash-image" src="/fooslash.jpg" priority />
      <Link href="/client-side">
        <a id="clientlink">Client Side</a>
      </Link>
      <Link href="/lazy">
        <a id="lazylink">lazy</a>
      </Link>
      <p id="stubtext">This is the index page</p>
    </div>
  )
}

export default Page
