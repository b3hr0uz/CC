'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Critical pages to preload for better user experience
const CRITICAL_PAGES = [
  '/dashboard',
  '/training',
  '/assistant',
  '/profile',
  '/settings',
  '/privacy',
  '/terms'
]

export default function PagePreloader() {
  const router = useRouter()

  useEffect(() => {
    // Preload critical pages after initial page load
    const preloadPages = async () => {
      // Wait for initial page load to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Preload each critical page
      CRITICAL_PAGES.forEach(page => {
        try {
          router.prefetch(page)
          console.log(`📄 Preloaded: ${page}`)
        } catch (error) {
          console.warn(`⚠️ Failed to preload ${page}:`, error)
        }
      })
    }

    preloadPages()
  }, [router])

  return (
    <>
      {/* Hidden preload links for better caching */}
      <div style={{ display: 'none' }}>
        {CRITICAL_PAGES.map(page => (
          <Link key={page} href={page} prefetch={true}>
            {page}
          </Link>
        ))}
      </div>
    </>
  )
}

// Preload hook for components
export function usePagePreloader(pages: string[]) {
  const router = useRouter()

  useEffect(() => {
    pages.forEach(page => {
      router.prefetch(page)
    })
  }, [pages, router])
}