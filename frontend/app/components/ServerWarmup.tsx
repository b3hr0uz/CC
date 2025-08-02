'use client'

import { useEffect } from 'react'

// Critical API routes to warm up
const CRITICAL_API_ROUTES = [
  '/api/health',
  '/api/auth/session',
]

export default function ServerWarmup() {
  useEffect(() => {
    const warmupAPIs = async () => {
      // Wait for initial page load
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('🔥 Starting server warmup...')
      
      // Warmup critical API routes
      const warmupPromises = CRITICAL_API_ROUTES.map(async (route) => {
        try {
          const response = await fetch(route, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache',
            },
          })
          
          if (response.ok) {
            console.log(`🔥 Warmed up: ${route}`)
          } else {
            console.warn(`⚠️ Warmup failed for ${route}: ${response.status}`)
          }
        } catch (error) {
          console.warn(`⚠️ Warmup error for ${route}:`, error)
        }
      })
      
      await Promise.allSettled(warmupPromises)
      console.log('✅ Server warmup complete')
    }

    warmupAPIs()
  }, [])

  return null // This component doesn't render anything
}

// Utility function to warmup specific routes
export const warmupRoute = async (route: string): Promise<boolean> => {
  try {
    const response = await fetch(route, {
      method: 'HEAD', // Use HEAD for lighter requests
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    return response.ok
  } catch {
    return false
  }
}