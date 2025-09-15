import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseClient } from "@/lib/supabase/server"
import { createSession } from "@/lib/auth-service"
import { createV0Project } from "@/lib/v0-service"

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json()

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`,
        },
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Signup failed" }, { status: 400 })
    }

    if (authData.user && authData.session) {
      // Update the user record with display_name
      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
        })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error("User update failed:", updateError)
      }

      // Create user credits
      const { error: creditsError } = await supabase.from("user_credits").insert([
        {
          user_id: authData.user.id,
          balance_bigint: 1000,
          reserved_bigint: 0,
        },
      ])

      if (creditsError) {
        console.error("Credits creation failed:", creditsError)
      }

      const sessionData = {
        userId: authData.user.id,
        email: authData.user.email || "",
        displayName: `${firstName} ${lastName}`,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      }

      await createSession(sessionData)

      try {
        const v0Result = await createV0Project({
          name: `${firstName}'s AI Workspace`,
          description: `Personal AI workspace for ${firstName} ${lastName}`,
          userId: authData.user.id,
          userEmail: authData.user.email || "",
        })
        console.log("Successfully created v0 project:", v0Result.project?.id)
      } catch (v0Error) {
        console.error("V0 project creation failed:", v0Error)
      }

      return NextResponse.json({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          display_name: sessionData.displayName,
          metadata: authData.user.user_metadata,
          created_at: authData.user.created_at,
        },
      })
    } else {
      // User needs to confirm email, but we can still update their profile
      if (authData.user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            display_name: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName,
          })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error("User update failed:", updateError)
        }
      }

      return NextResponse.json(
        { error: "Please check your email and click the confirmation link to complete signup." },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
