export const unstable_getStaticProps = async () => {
  return {
    props: { world: 'world' },
  }
}

export const unstable_getServerSideProps = async () => {
  return {
    props: { world: 'world' },
  }
}

export default ({ world }) => <p>Hello {world}</p>
