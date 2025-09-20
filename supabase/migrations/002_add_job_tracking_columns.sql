-- Add columns to jobs table for tracking v0 processing jobs
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS result jsonb,
ADD COLUMN IF NOT EXISTS error text,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finished_at timestamp with time zone;

-- Add index for faster job status queries
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON public.jobs(status, created_at);

-- Add index for user-specific job queries
CREATE INDEX IF NOT EXISTS idx_jobs_user_id_created_at ON public.jobs(user_id, created_at);
