import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_credits')
      .select('user_id, balance_bigint, reserved_bigint, paid_or_unpaid')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Credits not found' }, { status: 404 })
    }

    return NextResponse.json({
      userId: data.user_id,
      balance: Number(data.balance_bigint) || 0,
      reserved: Number(data.reserved_bigint) || 0,
      paid: !!data.paid_or_unpaid,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


