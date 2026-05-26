import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')   ||
    pathname.includes('.')
  ) return NextResponse.next();

  const role = req.cookies.get('user_role')?.value;

  if (role === 'mediator' && pathname.startsWith('/wallet'))
    return NextResponse.redirect(new URL('/agent', req.url));

  if (role === 'user' && pathname.startsWith('/agent'))
    return NextResponse.redirect(new URL('/mediators', req.url));

  if (role !== 'mediator' && pathname.startsWith('/mediator-pricing'))
    return NextResponse.redirect(new URL('/mediators', req.url));

  const isProtected = pathname.startsWith('/wallet') || pathname.startsWith('/agent');
  if (isProtected && !role)
    return NextResponse.redirect(
      new URL(`/auth?return=${encodeURIComponent(pathname)}`, req.url)
    );

  // ✅ /auth: لا توجيه هنا — الصفحة نفسها تتولى الأمر
  const res = NextResponse.next();

  const country = req.headers.get('x-vercel-ip-country') ?? 'TN';
  if (!req.cookies.get('geo_country')?.value) {
    res.cookies.set('geo_country', country, {
      path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax',
    });
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};