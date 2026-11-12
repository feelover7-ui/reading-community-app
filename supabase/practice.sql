-- 한마음선원 등불사장: 함께 쌓는 정진 기록
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행합니다.
-- 로그인 도입 전이라 lanterns·posts 와 같은 임시 공개 MVP 정책입니다.
-- 이 파일을 실행하기 전에는 앱이 '이 브라우저에만 저장' 으로 돌아갑니다.

create table if not exists public.practice (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  nick text not null,
  bows integer not null,
  kind text not null default 'bow',
  dedication text not null default '',
  created_at timestamptz not null default now()
);

-- 오늘 것만 자주 읽는다. 날짜로 먼저 좁힌다.
create index if not exists practice_day_idx on public.practice (day, created_at desc);

alter table public.practice enable row level security;

-- 임시 공개 MVP 정책: 누구나 오늘 도량에 쌓인 절을 보고, 자기 절을 올릴 수 있습니다.
-- 수정·삭제 권한은 주지 않습니다. 지난 날짜로 끼워 넣는 것도 막습니다.
drop policy if exists "practice public read" on public.practice;
create policy "practice public read"
  on public.practice for select
  to anon, authenticated
  using (true);

drop policy if exists "practice public insert" on public.practice;
create policy "practice public insert"
  on public.practice for insert
  to anon, authenticated
  with check (
    day = ((now() at time zone 'Asia/Seoul')::date)
    and bows between 1 and 1000
    and length(btrim(nick)) between 1 and 12
    and length(dedication) <= 24
    and kind in ('bow', 'yebul', 'together')
  );

-- 다른 법우가 절을 마치는 순간 숫자가 올라가게 하려면 Realtime 을 켭니다.
-- (이미 켜져 있으면 그냥 넘어갑니다. 여러 번 실행해도 안전합니다.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'practice'
  ) then
    alter publication supabase_realtime add table public.practice;
  end if;
end $$;
