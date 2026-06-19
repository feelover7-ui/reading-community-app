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

## Important Note

The current Supabase policy is intentionally permissive for a no-login MVP. Before adding personal accounts or Kakao login, replace the temporary public policies with user-owned row policies using `auth.uid()`.

## Do Not Commit

- `.env.local`
- Supabase `service_role` key
- Supabase secret key
- Database password
- Kakao Client Secret
- Vercel token
