import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    // Mock Data Credentials Provider for testing/demo purposes
    CredentialsProvider({
      id: 'mock-data',
      name: 'Mock Data',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'demo' },
        password: { label: 'Password', type: 'password', placeholder: 'demo' }
      },
      async authorize(credentials) {
        // Simple mock authentication - in production, this would validate against a database
        if (credentials?.username === 'demo' && credentials?.password === 'demo') {
          return {
            id: 'mock-user-001',
            name: 'Demo User',
            email: 'demo@contextcleanse.ai',
            image: null,
            // Flag to indicate this is a mock user
            isMockUser: true
          }
        }
        return null
      }
    }),
    // Apple Provider (disabled for now - requires Apple Developer account setup)
    ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET ? [
      AppleProvider({
        clientId: process.env.AUTH_APPLE_ID!,
        clientSecret: process.env.AUTH_APPLE_SECRET!,
      })
    ] : []),
    // Azure AD Provider (disabled for now - requires Azure AD app registration)
    ...(process.env.AUTH_AZURE_AD_ID && process.env.AUTH_AZURE_AD_SECRET ? [
      AzureADProvider({
        clientId: process.env.AUTH_AZURE_AD_ID!,
        clientSecret: process.env.AUTH_AZURE_AD_SECRET!,
        tenantId: process.env.AUTH_AZURE_AD_TENANT_ID!,
        authorization: {
          params: {
            scope: 'openid email profile https://graph.microsoft.com/mail.read',
          },
        },
      })
    ] : []),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      if (user && 'isMockUser' in user) {
        token.isMockUser = user.isMockUser
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.isMockUser = token.isMockUser as boolean
      return session
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}