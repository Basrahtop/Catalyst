import nextraPlugin from 'nextra'

const withNextra = nextraPlugin({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.js',
})

export default withNextra()
