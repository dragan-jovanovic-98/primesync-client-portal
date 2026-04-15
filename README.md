# Primesync Client Portal

Standalone Next.js application for the Primesync client-facing portal.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Environment

Copy `.env.local.example` to `.env.local` and fill in the required values.

Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for browser and SSR auth clients. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is only kept as a temporary fallback during migration.
