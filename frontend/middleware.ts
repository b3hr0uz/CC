import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Redirect all main page routes to /main to use our SPA approach
    if (pathname === '/dashboard' || pathname === '/assistant' || pathname === '/training' || pathname === '/settings') {
      return NextResponse.redirect(new URL('/main', req.url));
    }

    // Allow other routes to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard', '/assistant', '/training', '/settings', '/main']
};