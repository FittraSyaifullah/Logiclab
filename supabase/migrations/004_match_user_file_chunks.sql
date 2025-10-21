-- RPC to return top-k matching user file chunks using pgvector cosine distance
create or replace function public.match_user_file_chunks(
  p_user_id uuid,
  p_embedding vector(1536),
  p_limit int
) returns table (
  file_id uuid,
  chunk_index int,
  content_text text,
  similarity real
) language sql stable as $$
  select
    fe.file_id,
    fe.chunk_index,
    fe.content_text,
    1 - (fe.embedding <=> p_embedding) as similarity
  from public.file_embeddings fe
  where fe.user_id = p_user_id
  order by fe.embedding <=> p_embedding
  limit p_limit;
$$;




