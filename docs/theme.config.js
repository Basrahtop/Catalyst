export default {
  logo: <span><strong>Catalyst</strong> - Regenerative Capital for African SMEs</span>,
  project: {
    link: 'https://github.com/yourusername/catalyst-project'
  },
  docsRepositoryBase: 'https://github.com/yourusername/catalyst-project/blob/main/docs',
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Catalyst'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Catalyst Documentation" />
      <meta property="og:description" content="Trust-Based Investment Platform for African SMEs" />
    </>
  ),
  footer: {
    text: `MIT ${new Date().getFullYear()} © Catalyst Project`
  }
}
