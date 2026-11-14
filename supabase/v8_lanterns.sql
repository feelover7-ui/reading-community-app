-- 한마음 도량여행 v8: 함께 보는 발원등
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행합니다.
-- 여러 번 실행해도 안전합니다.
--
-- 왜 기존 public.lanterns 를 안 쓰는가:
--   기존 표는 등불사장(/deungbul.html)용이라 wish 24자 · shape 넷(lotus/wheel/fish/elephant)뿐입니다.
--   v8 은 발원 180자에 등 모양이 열세 가지라 들어가지 않고, 억지로 넣으면 등불사장 화면에
--   그릴 수 없는 등이 섞입니다. 그래서 표를 따로 둡니다. 서로 건드리지 않습니다.

create table if not exists public.v8_lantern (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  shape text not null,
  color text not null,
  name text not null,
  vow text not null,
  created_at timestamptz not null default now()
);

create index if not exists v8_lantern_created_at_idx on public.v8_lantern (created_at desc);
create index if not exists v8_lantern_owner_idx on public.v8_lantern (owner);

alter table public.v8_lantern enable row level security;

-- 로그인 전이라 기존 표들과 같은 임시 공개 MVP 정책입니다.
-- 누구나 걸린 등을 보고, 자기 등을 걸 수 있습니다. 수정·삭제 권한은 주지 않습니다.
drop policy if exists "v8 lantern public read" on public.v8_lantern;
create policy "v8 lantern public read"
  on public.v8_lantern for select
  to anon, authenticated
  using (true);

drop policy if exists "v8 lantern public insert" on public.v8_lantern;
create policy "v8 lantern public insert"
  on public.v8_lantern for insert
  to anon, authenticated
  with check (
    length(btrim(owner)) between 1 and 64
    and length(btrim(name)) between 1 and 40
    and length(btrim(vow)) between 2 and 180
    and color ~ '^#[0-9a-fA-F]{6}$'
    and shape in (
      'lotus','round','star','wind','windbell','fish','elephant',
      'wheel','square','palace','cloud','bell','lantern'
    )
  );

-- 남이 등을 거는 순간 전시장에 뜨게 하려면 Realtime 을 켭니다.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'v8_lantern'
  ) then
    alter publication supabase_realtime add table public.v8_lantern;
  end if;
end $$;
