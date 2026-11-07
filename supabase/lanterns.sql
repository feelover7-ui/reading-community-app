-- 한마음선원 등불사장: 함께 보는 소원등 테이블
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하면 됩니다.
-- 로그인 도입 전이라 public.books 와 같은 임시 공개 MVP 정책입니다.

create table if not exists public.lanterns (
  id uuid primary key default gen_random_uuid(),
  shape text not null,
  color text not null,
  pattern text not null,
  wish text not null,
  owner text not null,
  created_at timestamptz not null default now()
);

create index if not exists lanterns_created_at_idx on public.lanterns (created_at desc);

alter table public.lanterns enable row level security;

-- 임시 공개 MVP 정책: 누구나 걸린 등을 보고, 자기 등을 걸 수 있습니다.
-- 수정/삭제 권한은 주지 않습니다.
drop policy if exists "lanterns public read" on public.lanterns;
create policy "lanterns public read"
  on public.lanterns for select
  to anon, authenticated
  using (true);

drop policy if exists "lanterns public insert" on public.lanterns;
create policy "lanterns public insert"
  on public.lanterns for insert
  to anon, authenticated
  with check (
    length(wish) <= 24
    and length(owner) between 1 and 64
    and shape in ('lotus', 'wheel', 'fish', 'elephant')
  );

-- 다른 법우가 등을 거는 순간 화면에 뜨게 하려면 Realtime 을 켭니다.
-- (이미 켜져 있으면 그냥 넘어갑니다. 여러 번 실행해도 안전합니다.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lanterns'
  ) then
    alter publication supabase_realtime add table public.lanterns;
  end if;
end $$;
