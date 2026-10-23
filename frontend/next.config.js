/** @type {import('next').NextConfig} */
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
      { protocol: 'https', hostname: 'vibechops.onrender.com', pathname: '**' },
    ],
    domains: [
      'images.unsplash.com',
      'res.cloudinary.com',
      'vibechops.onrender.com',
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
        destination: 'https://vibechops.onrender.com/api/:path*',
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
