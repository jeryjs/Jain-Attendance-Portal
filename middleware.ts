import { NextRequest, NextResponse } from 'next/server';

const ADMIN_BYPASS_COOKIE = 'admin_bypass';

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (pathname.startsWith('/sunset')) return NextResponse.next();
	if (pathname.startsWith('/api')) return NextResponse.next();
	if (pathname.startsWith('/_next')) return NextResponse.next();
	if (pathname === '/favicon.ico') return NextResponse.next();

	const hasBypass = request.cookies.get(ADMIN_BYPASS_COOKIE)?.value === '1';
	if (hasBypass) return NextResponse.next();

	const url = request.nextUrl.clone();
	url.pathname = '/sunset';
	url.search = '';
	return NextResponse.redirect(url);
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sunset|api).*)'],
};