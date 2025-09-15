-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  token_hash text NOT NULL,
  scopes ARRAY DEFAULT '{}'::text[],
  revoked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  change_bigint bigint NOT NULL,
  balance_after_bigint bigint NOT NULL,
  type text NOT NULL,
  reason text,
  ref_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  priority integer DEFAULT 50,
  input jsonb,
  result jsonb,
  tokens_consumed bigint DEFAULT 0,
  error text,
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  type text DEFAULT 'v0'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  chatID uuid,
  webUrl text,
  privacy text,
  environment_variables ARRAY,
  v0_id text,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.software (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  repo_url text,
  manifest jsonb,
  created_at timestamp with time zone DEFAULT now(),
  web_url text,
  api_Url text,
  demo_url text,
  url text,
  software_id text,
  CONSTRAINT software_pkey PRIMARY KEY (id),
  CONSTRAINT software_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.software_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  software_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  content text NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT software_messages_pkey PRIMARY KEY (id),
  CONSTRAINT software_messages_software_id_fkey FOREIGN KEY (software_id) REFERENCES public.software(id)
);
CREATE TABLE public.user_credits (
  user_id uuid NOT NULL,
  balance_bigint bigint NOT NULL DEFAULT 0,
  reserved_bigint bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_credits_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  username text UNIQUE,
  display_name text,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);