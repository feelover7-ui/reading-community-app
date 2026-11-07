-- 등불사장 입력 및 권한 보강. board.sql, lanterns.sql 적용 후 실행합니다.
-- 기존 기록을 삭제하지 않습니다. NOT VALID 제약은 새 쓰기부터 검사합니다.
-- 운영 DB에서 실행하지 않은 변경안입니다.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.lanterns'::regclass and conname = 'lanterns_safe_input_v1'
  ) then
    alter table public.lanterns add constraint lanterns_safe_input_v1 check (
      shape in ('lotus', 'wheel', 'fish', 'elephant')
      and color ~ '^#[0-9A-Fa-f]{6}$'
      and pattern in ('none', 'dots', 'wave', 'dancheong', 'gold')
      and length(btrim(wish)) between 1 and 24
      and length(btrim(owner)) between 1 and 64
    ) not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.posts'::regclass and conname = 'posts_safe_input_v1'
  ) then
    alter table public.posts add constraint posts_safe_input_v1 check (
      length(btrim(nick)) between 1 and 12
      and length(btrim(body)) between 1 and 500
      and pw_hash ~ '^[0-9a-f]{64}$'
    ) not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.messages'::regclass and conname = 'messages_safe_input_v1'
  ) then
    alter table public.messages add constraint messages_safe_input_v1 check (
      length(btrim(nick)) between 1 and 12
      and length(btrim(body)) between 1 and 200
    ) not valid;
  end if;
end;
$$;

-- id와 작성 시각은 서버가 정합니다. 공개 수정·삭제는 허용하지 않습니다.
revoke all on public.lanterns from public, anon, authenticated;
grant select (id, shape, color, pattern, wish, owner, created_at)
  on public.lanterns to anon, authenticated;
grant insert (shape, color, pattern, wish, owner)
  on public.lanterns to anon, authenticated;

commit;

-- 기존 자료를 검토·정리한 뒤 제약 전체 검증을 별도로 실행할 수 있습니다.
-- alter table public.lanterns validate constraint lanterns_safe_input_v1;
-- alter table public.posts validate constraint posts_safe_input_v1;
-- alter table public.messages validate constraint messages_safe_input_v1;
