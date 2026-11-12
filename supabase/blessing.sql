-- 한마음선원 등불사장: 서로 등 밝혀 주기
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행합니다.
-- lanterns.sql 을 먼저 적용한 뒤에 실행합니다. 여러 번 실행해도 안전합니다.

create table if not exists public.blessing (
  id uuid primary key default gen_random_uuid(),
  lantern_id uuid not null references public.lanterns(id) on delete cascade,
  owner text not null,
  created_at timestamptz not null default now(),
  -- 한 사람이 같은 등을 거듭 밝히지 않는다.
  unique (lantern_id, owner)
);

create index if not exists blessing_lantern_idx on public.blessing (lantern_id);

alter table public.blessing enable row level security;

-- 임시 공개 MVP 정책: 누구나 몇 명이 밝혔는지 보고, 한 번씩 밝힐 수 있습니다.
-- 수정·삭제 권한은 주지 않습니다.
drop policy if exists "blessing public read" on public.blessing;
create policy "blessing public read"
  on public.blessing for select
  to anon, authenticated
  using (true);

drop policy if exists "blessing public insert" on public.blessing;
create policy "blessing public insert"
  on public.blessing for insert
  to anon, authenticated
  with check (length(btrim(owner)) between 1 and 64);

-- 남이 밝혀 주는 순간 등이 밝아지게 하려면 Realtime 을 켭니다.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'blessing'
  ) then
    alter publication supabase_realtime add table public.blessing;
  end if;
end $$;
