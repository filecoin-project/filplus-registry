/** @type {import('next').NextConfig} */

module.exports = {
  output: 'standalone',
  webpack: (config) => {
    config.externals.push('encoding')
    return config
  },
}
