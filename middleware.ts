import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/' || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }
  const hasToken = Array.from(request.cookies.getAll()).some(
    c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )
  if (!hasToken) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
