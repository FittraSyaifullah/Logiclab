import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createSupabaseServerClient()

    const jobId = params.jobId
    console.log(`[JOBS] Status request for job: ${jobId}`)

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.log(`[JOBS] Job not found:`, jobError?.message)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    console.log(`[JOBS] Job status: ${job.status}`)
    console.log(`[JOBS] Job result:`, job.result)

    // If job is completed, return the software data from result
    if (job.status === 'completed') {
      const softwareData = job.result?.software

      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        completed: true,
        software: softwareData ? {
          id: softwareData.id,
          title: softwareData.title,
          demoUrl: softwareData.demoUrl,
          chatId: softwareData.chatId
        } : null,
        finishedAt: job.finished_at
      })
    }

    // If job failed, return error details
    if (job.status === 'failed') {
      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        completed: false,
        error: job.error,
        finishedAt: job.finished_at
      })
    }

    // Job is still processing
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      completed: false,
      startedAt: job.started_at
    })

  } catch (error) {
    console.error(`[JOBS] Job status error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
