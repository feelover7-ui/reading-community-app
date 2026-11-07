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

소원등은 로그인 없이 누구나 올릴 수 있습니다. 공개 링크를 아는 사람만 들어오는 행사용 공유를 전제로 합니다. 링크가 널리 퍼지면 원치 않는 글이 걸릴 수 있고, 지금은 화면에서 지우는 수단이 없습니다. 그런 줄은 Supabase 대시보드에서 직접 지워야 합니다.

## Important Note

The current Supabase policy is intentionally permissive for a no-login MVP. Before adding personal accounts or Kakao login, replace the temporary public policies with user-owned row policies using `auth.uid()`.

## Do Not Commit

- `.env.local`
- Supabase `service_role` key
- Supabase secret key
- Database password
- Kakao Client Secret
- Vercel token
