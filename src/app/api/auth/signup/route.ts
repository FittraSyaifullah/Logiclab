import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName } = body as { email?: string; password?: string; firstName?: string; lastName?: string }
    console.log(`[AUTH] Signup attempt for email: ${email}, name: ${firstName} ${lastName}`)

    if (!email || !password || !firstName || !lastName) {
      console.log(`[AUTH] Signup failed - missing required fields`)
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: `${firstName} ${lastName}`,
        },
      },
    })

    if (authError || !authData.user) {
      console.log(`[AUTH] Signup failed - Supabase error:`, authError?.message)
      return NextResponse.json({ error: authError?.message || "Signup failed" }, { status: 400 })
    }

    console.log(`[AUTH] Signup successful for user: ${authData.user.id}`)

    // Ensure user row exists in public.users
    await supabase
      .from('users')
      .upsert({ id: authData.user.id, display_name: `${firstName} ${lastName}`, email })

    // Optionally create an initial project row or return null

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        display_name: `${firstName} ${lastName}`,
      },
      project: null,
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
