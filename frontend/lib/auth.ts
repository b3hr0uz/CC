import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  providers: [
    // Google Provider - Only include if environment variables are available  
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [
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
      })
    ] : []),

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
      // Initial sign in
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        // Guard against undefined expires_at per NextAuth types
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 60 * 60 * 1000 // fallback 1h
        return token
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, try to refresh it
      return await refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.error = token.error
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
  // Enhanced error handling for production deployments
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('NextAuth Debug:', code, metadata)
      }
    }
  },
  // Ensure secret is always available (fallback for Vercel)
  secret: process.env.NEXTAUTH_SECRET || 'contextcleanse-fallback-secret-2024',
}

interface OAuthToken {
  accessToken?: string
  refreshToken?: string
  accessTokenExpires?: number
  error?: string
  // Allow provider-specific extras without using any
  [key: string]: unknown
}

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token: OAuthToken): Promise<OAuthToken> {
  try {
    const url = "https://oauth2.googleapis.com/token"

    if (!token.refreshToken) {
      throw new Error('Missing refresh token')
    }

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: (refreshedTokens as { access_token: string }).access_token,
      accessTokenExpires: Date.now() + (refreshedTokens as { expires_in: number }).expires_in * 1000,
      refreshToken: (refreshedTokens as { refresh_token?: string }).refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error("Error refreshing access token:", error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}