'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ShieldCheckIcon, 
  SparklesIcon, 
  BoltIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface OAuthProvider {
  name: string
  displayName: string
  icon: React.ReactNode
  color: string
}

const oauthProviders: OAuthProvider[] = [
  {
    name: 'google',
    displayName: 'Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    color: 'hover:bg-blue-50 border-blue-200'
  },
  {
    name: 'microsoft',
    displayName: 'Microsoft',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#f35325" d="M1 1h10v10H1z"/>
        <path fill="#81bc06" d="M13 1h10v10H13z"/>
        <path fill="#05a6f0" d="M1 13h10v10H1z"/>
        <path fill="#ffba08" d="M13 13h10v10H13z"/>
      </svg>
    ),
    color: 'hover:bg-blue-50 border-blue-200'
  },
  {
    name: 'apple',
    displayName: 'Apple',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
    color: 'hover:bg-gray-50 border-gray-200'
  }
]

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    checkSession()
  }, [])

  const checkSession = async () => {
    const session = await getSession()
    if (session) {
      router.push('/dashboard')
    }
  }

  const handleOAuthLogin = async (provider: string) => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mx-auto h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-6">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to <span className="text-gradient">Context Cleanse</span>
          </h1>
          <p className="text-gray-600">
                              Email classification with assistant
          </p>
        </motion.div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card"
        >
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Sign in to continue
              </h2>
              <p className="text-sm text-gray-600">
                Choose your preferred authentication method
              </p>
            </div>


            <div className="space-y-3">
              {oauthProviders
                .filter(provider => provider.name === 'google')
                .map((provider) => (
                  <motion.button
                    key={provider.name}
                    onClick={() => handleOAuthLogin(provider.name)}
                    disabled={loading === provider.name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      w-full flex items-center justify-center px-4 py-3 border rounded-lg
                      text-sm font-medium transition-all duration-200
                      ${provider.color}
                      ${loading === provider.name 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:shadow-md'
                      }
                    `}
                  >
                    {loading === provider.name ? (
                      <div className="w-5 h-5 loading-spinner mr-3" />
                    ) : (
                      <div className="mr-3">{provider.icon}</div>
                    )}
                    Continue with {provider.displayName}
                  </motion.button>
                ))}
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">
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