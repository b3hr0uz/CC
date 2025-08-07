/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output only for Docker builds, not for Vercel
  ...(process.env.DOCKER_BUILD === 'true' && { output: 'standalone' }),
  reactStrictMode: true,
  
  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com', 'graph.microsoft.com', 'appleid.apple.com'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
  },
  
  // API rewrites
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/:path*`
      }
    ]
  },
}

module.exports = nextConfig