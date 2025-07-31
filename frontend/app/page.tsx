'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  const [mockCredentials, setMockCredentials] = useState({ username: '', password: '' })
  const [showMockLogin, setShowMockLogin] = useState(false)
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
        console.error('Google OAuth error:', result.error)
        
        // Provide specific error messages based on error type
        switch (result.error) {
          case 'OAuthSignin':
            toast.error('OAuth configuration error. Please check the setup guide.')
            break
          case 'OAuthCallback':
            toast.error('OAuth callback failed. Please try again.')
            break
          case 'AccessDenied':
            toast.error('Access denied. Please grant permissions to continue.')
            break
          case 'Configuration':
            toast.error('OAuth configuration missing. Please check environment variables.')
            break
          default:
            toast.error(`Authentication error: ${result.error}`)
        }
        
        setLoading(null)
      } else if (result?.ok) {
        toast.success('Successfully signed in with Google!')
        // The redirect will happen automatically
      }
    } catch (error) {
      console.error(`${provider} login failed:`, error)
      toast.error(`Failed to login with ${provider}. Check the OAuth setup guide.`)
      setLoading(null)
    }
  }

  const handleMockLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('mock-data')
    
    try {
      const result = await signIn('mock-data', {
        username: mockCredentials.username,
        password: mockCredentials.password,
        callbackUrl: '/dashboard',
        redirect: false,
      })
      
      if (result?.error) {
        toast.error('Invalid demo credentials. Use username: demo, password: demo')
        setLoading(null)
      } else if (result?.ok) {
        toast.success('Successfully signed in with mock data!')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Mock login failed:', error)
      toast.error('Mock login failed')
      setLoading(null)
    }
  }

  return (
      <div className="min-h-screen flex" style={{backgroundColor: '#212121'}}>
        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              {/* ContextCleanse Logo */}
              <div className="mx-auto mb-6 flex justify-center">
                <Image 
                  src="/ContextCleanse-no-padding-transparent-dark-mode.png" 
                  alt="ContextCleanse Logo"
                  width={96}
                  height={96} 
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

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 text-gray-400" style={{backgroundColor: '#212121'}}>
                      or
                    </span>
                  </div>
                </div>

                {/* Mock Data Login Section */}
                <div className="space-y-3">
                  {!showMockLogin ? (
                    <motion.button
                      onClick={() => setShowMockLogin(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-500 rounded-lg text-sm font-medium transition-all duration-200 text-gray-300 hover:text-white hover:border-gray-400 hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-center">
                        Try with sample data (Demo)
                      </span>
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      className="border border-gray-600 rounded-lg p-4"
                      style={{backgroundColor: '#2a2a2a'}}
                    >
                      <div className="text-center mb-3">
                        <h3 className="text-sm font-medium text-white mb-1">Demo Mode</h3>
                        <p className="text-xs text-gray-400">
                          Experience ContextCleanse with sample data
                        </p>
                      </div>
                      
                      <form onSubmit={handleMockLogin} className="space-y-3">
                        <div>
                          <input
                            type="text"
                            placeholder="Username (demo)"
                            value={mockCredentials.username}
                            onChange={(e) => setMockCredentials({...mockCredentials, username: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={{backgroundColor: '#1a1a1a'}}
                            disabled={loading === 'mock-data'}
                          />
                        </div>
                        <div>
                          <input
                            type="password"
                            placeholder="Password (demo)"
                            value={mockCredentials.password}
                            onChange={(e) => setMockCredentials({...mockCredentials, password: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            style={{backgroundColor: '#1a1a1a'}}
                            disabled={loading === 'mock-data'}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            disabled={loading === 'mock-data'}
                            className="flex-1 flex items-center justify-center px-3 py-2 border border-blue-600 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {loading === 'mock-data' ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              '🚀 Enter Demo'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMockLogin(false)
                              setMockCredentials({ username: '', password: '' })
                            }}
                            className="px-3 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                      
                      <div className="mt-3 text-center">
                        <p className="text-xs text-gray-500">
                          💡 Hint: Username: <code className="text-blue-400">demo</code>, Password: <code className="text-blue-400">demo</code>
                        </p>
                      </div>
                    </motion.div>
                  )}
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
      </div>
  )
} 