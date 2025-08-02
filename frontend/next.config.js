/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output only for Docker builds, not for Vercel
  ...(process.env.DOCKER_BUILD === 'true' && { output: 'standalone' }),
  reactStrictMode: true,
  devIndicators: false,
  
  // ============ PERFORMANCE OPTIMIZATIONS ============
  
  // Experimental optimizations for faster builds and runtime
  experimental: {
    // Optimize static generation performance 
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 16,
    staticGenerationMinPagesPerWorker: 50,
    
    // Enable Server Components HMR cache for faster development
    serverComponentsHmrCache: true,
    
    // Optimize build performance
    optimizePackageImports: [
      '@heroicons/react',
      'framer-motion',
      'recharts',
      'lucide-react'
    ],
    
    // Enable optimized CSS loading
    optimizeCss: true,
    
    // Enable partial prerendering for better performance
    ppr: 'incremental',
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
    
    // Define build-time constants for better performance
    define: {
      __DEV__: process.env.NODE_ENV === 'development',
      __PROD__: process.env.NODE_ENV === 'production',
    },
  },
  
  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev) {
      // Optimize webpack cache for production builds
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: '.next/cache/webpack',
      }
      
      // Enable SWC minification for better performance
      config.optimization.minimize = true
      
      // Optimize chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            minChunks: 2,
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      }
    }
    
    return config
  },
  
  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com', 'graph.microsoft.com', 'appleid.apple.com'],
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
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
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  
  // Redirect strategy (removed automatic redirect to dashboard)
}

module.exports = nextConfig 