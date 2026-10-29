/** @type {import('next').NextConfig} */
const apiProxyTarget = (process.env.API_PROXY_TARGET || 'https://vibechops.onrender.com')
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '')
const apiHostname = (() => {
  try {
    return new URL(apiProxyTarget).hostname
  } catch {
    return 'vibechops.onrender.com'
  }
})()

const nextConfig = {
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  images: {
    // The Next image optimizer has had repeated RCE/DoS advisories in the
    // pinned Next 14 line. Serving the original CDN URLs avoids that local
    // optimizer surface until the framework major upgrade is scheduled.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '**' },
      { protocol: 'https', hostname: apiHostname, pathname: '**' },
    ],
    domains: [
      'images.unsplash.com',
      'res.cloudinary.com',
      apiHostname,
    ],
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/api/health', destination: '/health', permanent: true },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ]
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
}

module.exports = nextConfig
