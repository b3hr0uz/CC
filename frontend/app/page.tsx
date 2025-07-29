'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface OAuthProvider {
  name: string
  displayName: string
  icon: React.ReactNode
  color: string
  enabled: boolean
}

const oauthProviders: OAuthProvider[] = [
  {
    name: 'google',
    displayName: 'Google',
    enabled: true,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    color: 'hover:bg-white dark:hover:bg-black border-gray-300 dark:border-gray-600'
  },
  {
    name: 'apple',
    displayName: 'Apple',
    enabled: false,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
    color: 'hover:bg-white dark:hover:bg-black border-gray-300 dark:border-gray-600'
  },
  {
    name: 'azure-ad',
    displayName: 'Microsoft',
    enabled: false,
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#F25022" d="M1 1h10v10H1z"/>
        <path fill="#00A4EF" d="M13 1h10v10H13z"/>
        <path fill="#7FBA00" d="M1 13h10v10H1z"/>
        <path fill="#FFB900" d="M13 13h10v10H13z"/>
      </svg>
    ),
    color: 'hover:bg-white dark:hover:bg-black border-gray-300 dark:border-gray-600'
  }
]

export default function HomePage() {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in and redirect to dashboard
    getSession().then(session => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleOAuthLogin = async (provider: string) => {
    // Check if provider is enabled
    const providerConfig = oauthProviders.find(p => p.name === provider)
    if (!providerConfig?.enabled) {
      toast.error(`${providerConfig?.displayName || provider} authentication is not yet available`)
      return
    }

    if (provider !== 'google') {
      toast.error('Only Google authentication is currently supported')
      return
    }
    
    setLoading(provider)
    try {
      const result = await signIn('google', {
        callbackUrl: '/dashboard',
        redirect: false,
      })
      
      if (result?.error) {
        toast.error('Failed to sign in with Google')
        setLoading(null)
      }
    } catch (error) {
      console.error(`${provider} login failed:`, error)
      toast.error(`Failed to login with ${provider}`)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300" style={{backgroundColor: '#212121'}}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* ContextCleanse Logo */}
          <div className="mx-auto mb-6 flex justify-center">
            <img 
              src="/ContextCleanse.png" 
              alt="ContextCleanse Logo" 
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome to <span className="text-white font-bold">ContextCleanse</span>
          </h1>
          <p className="text-white text-sm sm:text-base">
            Email classification with assistance
          </p>
        </motion.div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-xl shadow-xl p-6 sm:p-8 border border-gray-600 backdrop-blur-sm" style={{backgroundColor: '#212121'}}
        >
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                Sign in to continue
              </h2>
              <p className="text-sm text-white">
                Choose your preferred authentication method
              </p>
            </div>

            <div className="space-y-3">
              {oauthProviders.map((provider) => (
                <motion.button
                  key={provider.name}
                  onClick={() => handleOAuthLogin(provider.name)}
                  disabled={loading === provider.name || !provider.enabled}
                  whileHover={provider.enabled ? { scale: 1.02 } : {}}
                  whileTap={provider.enabled ? { scale: 0.98 } : {}}
                  className={`
                    w-full flex items-center justify-center px-4 py-3 border-2 rounded-lg
                    text-sm font-medium transition-all duration-200 shadow-sm text-white border-gray-500
                    ${provider.enabled 
                      ? 'hover:shadow-md hover:border-gray-400 hover:bg-gray-700' 
                      : 'cursor-not-allowed opacity-50'
                    }
                    ${loading === provider.name 
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  `}
                  style={{backgroundColor: provider.enabled && loading !== provider.name ? '#2a2a2a' : '#212121'}}
                >
                  {loading === provider.name ? (
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mr-3" />
                  ) : (
                    <div className="mr-3 flex-shrink-0">{provider.icon}</div>
                  )}
                  <span className="flex-1 text-center">
                    Continue with {provider.displayName}
                  </span>
                </motion.button>
              ))}
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-white leading-relaxed">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="text-white hover:underline transition-colors font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-white hover:underline transition-colors font-medium">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 