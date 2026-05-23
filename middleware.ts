import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.'))
    return NextResponse.next();

  const role = req.cookies.get('user_role')?.value;

  if (role === 'mediator' && pathname.startsWith('/wallet'))
    return NextResponse.redirect(new URL('/agent', req.url));

  if (role === 'user' && pathname.startsWith('/agent'))
    return NextResponse.redirect(new URL('/mediators', req.url));

  const isProtected = pathname.startsWith('/wallet') || pathname.startsWith('/agent');
  if (isProtected && !role)
    return NextResponse.redirect(new URL(`/auth?return=${encodeURIComponent(pathname)}`, req.url));

  if (pathname === '/auth' && role)
    return NextResponse.redirect(new URL(role === 'mediator' ? '/agent' : '/mediators', req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};