import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSession } from "@/lib/auth-service"
import { createV0Project } from "@/lib/v0-service"

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json()
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
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`,
        },
      },
    })

    if (authError || !authData.user) {
      console.log(`[AUTH] Signup failed - Supabase error:`, authError?.message)
      return NextResponse.json({ error: authError?.message || "Signup failed" }, { status: 400 })
    }

    console.log(`[AUTH] Signup successful for user: ${authData.user.id}`)

    if (authData.user && authData.session) {
      // Update the user record with display_name (only if columns exist)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: `${firstName} ${lastName}`,
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

      // Session will be created on client side

      // Create v0 project and store in database
      let v0ProjectId = null
      try {
        console.log(`[AUTH] Creating v0 project for user: ${authData.user.id}`)
        const v0Result = await createV0Project({
          name: `${firstName}'s AI Workspace`,
          description: `Personal AI workspace for ${firstName} ${lastName}`,
          userId: authData.user.id,
          userEmail: authData.user.email || "",
        })
        
        if (v0Result.project?.id) {
          v0ProjectId = v0Result.project.id
          console.log(`[AUTH] Successfully created v0 project: ${v0ProjectId}`)
          
          // Create project record in database
          const { error: projectError } = await supabase
            .from('projects')
            .insert({
              owner_id: authData.user.id,
              slug: `workspace-${authData.user.id.slice(0, 8)}`,
              name: `${firstName}'s AI Workspace`,
              description: `Personal AI workspace for ${firstName} ${lastName}`,
              type: 'v0',
              v0_id: v0ProjectId
            })
          
          if (projectError) {
            console.error(`[AUTH] Failed to create project record:`, projectError)
          } else {
            console.log(`[AUTH] Project record created successfully`)
          }
        } else {
          console.log(`[AUTH] V0 project creation failed - no project ID returned`)
        }
      } catch (v0Error) {
        console.error(`[AUTH] V0 project creation failed:`, v0Error)
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
