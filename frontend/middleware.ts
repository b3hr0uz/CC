import { NextRequest, NextResponse } from 'next/server';
import { logger } from './lib/request-logger';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const userAgent = request.headers.get('user-agent');
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip;

  // Skip logging for static assets and internal Next.js routes
  const shouldSkipLogging = pathname.startsWith('/_next/') || 
                           pathname.startsWith('/api/auth/session') ||
                           pathname.includes('.map') ||
                           pathname.includes('favicon');

  if (!shouldSkipLogging) {
    // Log request start
    logger.logRequest({
      timestamp: new Date().toISOString(),
      method,
      path: pathname + search,
      userAgent: userAgent?.split(' ')[0],
      ip,
    });
  }

  // Continue with the request
  const response = NextResponse.next();

  // Log response (Note: This won't capture the actual status code from API routes)
  if (!shouldSkipLogging) {
    const duration = Date.now() - start;
    
    // We can't easily get the final response status here for all routes,
    // so we'll log completion without status for now
    setTimeout(() => {
      logger.logRequest({
        timestamp: new Date().toISOString(),
        method,
        path: pathname + search,
        status: response.status,
        duration,
        userAgent: userAgent?.split(' ')[0],
        ip,
      });
    }, 0);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
