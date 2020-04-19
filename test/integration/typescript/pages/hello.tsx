import { useRouter } from 'next/router'
import React from 'react'
import { hello } from '../components/hello'
import Link from '../components/link'
import Router from '../components/router'
import { World } from '../components/world'
import { value as resolveOrderValue } from '../extension-order/js-first'

export default function HelloPage(): JSX.Element {
  const router = useRouter()
  console.log(process.browser)
  console.log(router.pathname)
  return (
    <div>
      <p>One trillion dollars: {1_000_000_000_000}</p>
      <p id="imported-value">{resolveOrderValue}</p>
      {hello()} <World />
      <Router />
      <Link />
    </div>
  )
}
