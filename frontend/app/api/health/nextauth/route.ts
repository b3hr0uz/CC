import { NextRequest, NextResponse } from 'next/server'

/**
 * NextAuth Configuration Health Check
 * This endpoint helps diagnose NextAuth configuration issues
 */
export async function GET(request: NextRequest) {
  try {
    const configStatus = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nextauth_url: process.env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing',
      nextauth_secret: process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing',
      oauth_providers: {
        google: {
          client_id: process.env.AUTH_GOOGLE_ID ? '✅ Set' : '❌ Missing',
          client_secret: process.env.AUTH_GOOGLE_SECRET ? '✅ Set' : '❌ Missing'
        },
        apple: {
          client_id: process.env.AUTH_APPLE_ID ? '✅ Set' : '❌ Missing',
          client_secret: process.env.AUTH_APPLE_SECRET ? '✅ Set' : '❌ Missing'
        },
        azure: {
          client_id: process.env.AUTH_AZURE_AD_ID ? '✅ Set' : '❌ Missing',
          client_secret: process.env.AUTH_AZURE_AD_SECRET ? '✅ Set' : '❌ Missing',
          tenant_id: process.env.AUTH_AZURE_AD_TENANT_ID ? '✅ Set' : '❌ Missing'
        }
      }
    }

    // Determine overall health
    const isHealthy = process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET
    const status = isHealthy ? 'healthy' : 'configuration_error'
    
    // Provide recommendations
    const recommendations = []
    
    if (!process.env.NEXTAUTH_URL) {
      if (process.env.NODE_ENV === 'production') {
        recommendations.push('Set NEXTAUTH_URL to https://contextcleanse.vercel.app in Vercel environment variables')
      } else {
        recommendations.push('Set NEXTAUTH_URL to http://localhost:3000 in .env file')
      }
    }
    
    if (!process.env.NEXTAUTH_SECRET) {
      recommendations.push('Set NEXTAUTH_SECRET to a secure 32+ character string in environment variables')
    }
    
    if (!process.env.AUTH_GOOGLE_ID && !process.env.AUTH_APPLE_ID && !process.env.AUTH_AZURE_AD_ID) {
      recommendations.push('OAuth providers are optional - demo mode works without them')
    }

    return NextResponse.json({
      status,
      healthy: isHealthy,
      config: configStatus,
      recommendations,
      demo_mode_available: true, // Demo mode should always work with proper NextAuth config
      message: isHealthy 
        ? 'NextAuth configuration looks good! Demo mode should work.' 
        : 'NextAuth configuration issues detected. Demo mode may not work properly.'
    })

  } catch (error) {
    console.error('NextAuth health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to check NextAuth configuration',
      recommendations: [
        'Check server logs for detailed error information',
        'Ensure all required environment variables are set',
        'Verify NextAuth is properly configured in lib/auth.ts'
      ]
    }, { status: 500 })
  }
}