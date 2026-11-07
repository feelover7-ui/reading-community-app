-- 한마음선원 등불사장: 마당 방명록(게시판) + 이야기 나누기(채팅)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하면 됩니다.
-- 여러 번 실행해도 안전합니다.
-- 로그인 도입 전이라 public.books, public.lanterns 와 같은 임시 공개 MVP 정책입니다.

-- ---------------------------------------------------------------
-- 1. 방명록 글
-- ---------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  nick text not null,
  body text not null,
  pw_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

-- 비밀번호 해시는 아무도 읽어 갈 수 없게 컬럼 단위로 막습니다.
-- 이걸 막지 않으면 누구나 해시를 받아 가서 남의 글을 지울 수 있습니다.
revoke all on public.posts from anon, authenticated;
grant select (id, nick, body, created_at) on public.posts to anon, authenticated;
grant insert (nick, body, pw_hash) on public.posts to anon, authenticated;

drop policy if exists "posts public read" on public.posts;
create policy "posts public read"
  on public.posts for select
  to anon, authenticated
  using (true);

drop policy if exists "posts public insert" on public.posts;
create policy "posts public insert"
  on public.posts for insert
  to anon, authenticated
  with check (
    length(nick) between 1 and 12
    and length(body) between 1 and 500
    and length(pw_hash) = 64
  );

-- 삭제는 비밀번호가 맞을 때만. 해시 비교를 서버에서 하므로
-- 브라우저는 남의 해시를 볼 일이 없습니다.
create or replace function public.delete_post(p_id uuid, p_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  removed int;
begin
  delete from public.posts where id = p_id and pw_hash = p_hash;
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke all on function public.delete_post(uuid, text) from public;
grant execute on function public.delete_post(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- 2. 이야기 나누기 (채팅)
-- ---------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  nick text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_created_at_idx on public.messages (created_at desc);

alter table public.messages enable row level security;

revoke all on public.messages from anon, authenticated;
grant select (id, nick, body, created_at) on public.messages to anon, authenticated;
grant insert (nick, body) on public.messages to anon, authenticated;

drop policy if exists "messages public read" on public.messages;
create policy "messages public read"
  on public.messages for select
  to anon, authenticated
  using (true);

drop policy if exists "messages public insert" on public.messages;
create policy "messages public insert"
  on public.messages for insert
  to anon, authenticated
  with check (
    length(nick) between 1 and 12
    and length(body) between 1 and 200
  );

-- 채팅은 지우는 기능이 없습니다. 문제가 되는 줄은 대시보드에서 직접 지웁니다.

-- ---------------------------------------------------------------
-- 3. Realtime
-- ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
