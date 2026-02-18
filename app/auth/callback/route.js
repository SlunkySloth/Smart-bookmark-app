import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    // exchange the code we get from google for an actual session
    await supabase.auth.exchangeCodeForSession(code)
  }

  // redirect back to homepage after login
  return NextResponse.redirect(new URL('/', request.url))
}
