import React from 'react'
import Link from 'next/link'
import fetch from 'node-fetch'

function Index({ stars }) {
  return (
    <div>
      <p>Next.js has {stars} ⭐️</p>
      <Link href="/preact">
        <a>How about preact?</a>
      </Link>
    </div>
  )
}

export async function getStaticProps() {
  const res = await fetch('https://api.github.com/repos/zeit/next.js')
  const json = await res.json() // better use it inside try .. catch
  return {
    props: {
      stars: json.stargazers_count,
    },
  }
}

export default Index
