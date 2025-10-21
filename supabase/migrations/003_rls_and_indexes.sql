-- RLS and indexes for files and file_embeddings, plus Storage policies for user_files bucket

-- Enable RLS
alter table if exists public.files enable row level security;
alter table if exists public.file_embeddings enable row level security;

-- Files policies
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'files' and policyname = 'files owner select'
  ) then
    create policy "files owner select" on public.files for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'files' and policyname = 'files owner insert'
  ) then
    create policy "files owner insert" on public.files for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'files' and policyname = 'files owner update'
  ) then
    create policy "files owner update" on public.files for update using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'files' and policyname = 'files owner delete'
  ) then
    create policy "files owner delete" on public.files for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Embeddings policies
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'file_embeddings' and policyname = 'embeddings owner select'
  ) then
    create policy "embeddings owner select" on public.file_embeddings for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'file_embeddings' and policyname = 'embeddings owner insert'
  ) then
    create policy "embeddings owner insert" on public.file_embeddings for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'file_embeddings' and policyname = 'embeddings owner delete'
  ) then
    create policy "embeddings owner delete" on public.file_embeddings for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Indexes
create unique index if not exists files_user_bucket_path_unique on public.files(user_id, bucket, path);
create index if not exists file_embeddings_file_id_idx on public.file_embeddings(file_id);

-- Storage bucket and RLS policies
do $$
begin
  if not exists (select 1 from storage.buckets where name = 'user_files') then
    perform storage.create_bucket('user_files', public := false);
  end if;
end$$;

-- Allow authenticated users to access only their own prefix in user_files
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'user_files objects select'
  ) then
    create policy "user_files objects select" on storage.objects for select to authenticated
      using (bucket_id = 'user_files' and (name like (auth.uid()::text || '/%')));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'user_files objects insert'
  ) then
    create policy "user_files objects insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'user_files' and (name like (auth.uid()::text || '/%')));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'user_files objects update'
  ) then
    create policy "user_files objects update" on storage.objects for update to authenticated
      using (bucket_id = 'user_files' and (name like (auth.uid()::text || '/%')));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'user_files objects delete'
  ) then
    create policy "user_files objects delete" on storage.objects for delete to authenticated
      using (bucket_id = 'user_files' and (name like (auth.uid()::text || '/%')));
  end if;
end $$;





