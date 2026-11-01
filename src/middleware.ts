import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 역할 분리 핵심: 보호자는 /caregiver 경로를, 요양보호사는 /guardian 경로를 볼 수 없게 막는다.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = path.startsWith('/guardian') || path.startsWith('/caregiver')

  if (isProtected) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (path.startsWith('/guardian') && profile?.role !== 'guardian') {
      return NextResponse.redirect(new URL('/caregiver', request.url))
    }
    if (path.startsWith('/caregiver') && profile?.role !== 'caregiver') {
      return NextResponse.redirect(new URL('/guardian', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/guardian/:path*', '/caregiver/:path*'],
}
