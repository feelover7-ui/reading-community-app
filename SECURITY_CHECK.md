# Security Check

## Current Status

- `.env.local` is not committed.
- `.env`, `.env.*` are ignored except `.env.example`.
- `node_modules/`, `dist/`, `.vercel/`, `work/`, `outputs/` are ignored.
- Supabase `service_role` key is not used.
- Supabase secret key is not used.
- Database password is not used.
- Frontend uses only Supabase URL and publishable key through Vite environment variables.

## Supabase

- Project ref: `vsnbzwofscqeeewscozp`
- Table: `public.books`
- RLS: enabled
- Temporary MVP policies allow `anon` and `authenticated` users to select, insert, update, and delete rows.

### `public.lanterns` (등불사장 소원등)

- RLS: enabled
- `select`: public
- `insert`: public, with a check on wish length (24자), owner length, and allowed shape values
- `update`, `delete`: no public policy

### `public.posts` (마당 방명록 글)

- RLS: enabled
- `select`: public, but only on `id, nick, body, created_at`
- `pw_hash`: no select grant for `anon` or `authenticated`, so nobody can read it back
- `insert`: public, with a check on nick length (12자), body length (500자), and hash length (64)
- `update`, `delete`: no public policy
- Deleting goes through `public.delete_post(uuid, text)`, a security definer function that compares the hash server side

비밀번호는 브라우저에서 `SHA-256(닉네임:비밀번호:deungbul-v1)` 로 바꾼 뒤에 보냅니다. 평문 비밀번호는 저장되지 않고, 해시도 다시 읽어 갈 수 없습니다.

### `public.messages` (이야기 나누기)

- RLS: enabled
- `select`, `insert`: public, with a check on nick length (12자) and body length (200자)
- `update`, `delete`: no public policy, and no in-app delete

소원등, 방명록 글, 채팅 모두 로그인 없이 누구나 올릴 수 있습니다. 공개 링크를 아는 사람만 들어오는 행사용 공유를 전제로 합니다. 링크가 널리 퍼지면 원치 않는 글이 올라올 수 있습니다. 방명록 글은 쓴 사람이 비밀번호로 지울 수 있지만, 소원등과 채팅은 화면에서 지우는 수단이 없어서 Supabase 대시보드에서 직접 지워야 합니다.

## Important Note

The current Supabase policy is intentionally permissive for a no-login MVP. Before adding personal accounts or Kakao login, replace the temporary public policies with user-owned row policies using `auth.uid()`.

## Do Not Commit

- `.env.local`
- Supabase `service_role` key
- Supabase secret key
- Database password
- Kakao Client Secret
- Vercel token
