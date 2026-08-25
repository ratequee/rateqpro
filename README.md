# RateQ Pro

Independent business administration and financial management product under the RateQ brand.

This is **not** connected to the existing RateQ application.

## Stack

- **App:** Next.js on Vercel
- **Database + files:** Supabase (Postgres + private Storage)
- **ORM:** Prisma, tenant-scoped (`companyId` on every company record)
- **Auth:** custom sessions (not Supabase Auth)

## Environment variables

New Supabase projects no longer show an `anon` key. Use the names from **Connect** and **API Keys**:

| Variable | Where to copy it | Used for |
|---|---|---|
| `DATABASE_URL` | Connect → ORMs → Prisma, **transaction** pooler (port **6543**) | App queries (Prisma) |
| `DIRECT_URL` | Same panel, **session** pooler (port **5432**) | Migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Connect → App Frameworks → Next.js | Storage client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same panel (`sb_publishable_...`) | Public/low-privilege API key (replaces `anon`) |
| `SUPABASE_SECRET_KEY` | **Project Settings → API Keys** (`sb_secret_...`) | Private file uploads/downloads (replaces `service_role`) |

The Connect panel does **not** show the secret key. Open **Project Settings → API Keys** and copy a **secret** key. Never prefix it with `NEXT_PUBLIC_`.

If a database password contains `@`, `#`, or `/`, encode it in both Postgres URLs (`@` → `%40`).

Legacy names still work if you have them: `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

Ledger, login, and the dashboard work with only `DATABASE_URL` + `DIRECT_URL`. Attachments also need `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

## Local setup

```bash
cp .env.example .env
docker compose up -d
npx prisma migrate dev
npm run db:seed
npm run dev
```

Demo login: `oscar.d@example.net` / `RateQPro!Demo`

To point this app at your Supabase project instead of Docker, put the five variables above in `.env`, then:

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## Deploy (Vercel + Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the variables from the table above. Add `sslmode=require` on both Postgres URLs, and `pgbouncer=true` on `DATABASE_URL`.
3. Run the schema and demo data once from your machine (uses `DIRECT_URL`):

```bash
npx prisma migrate deploy
npm run db:seed
```

4. Optional: run `supabase/storage.sql` in the Supabase SQL editor. The app can also create the private `attachments` bucket on first upload.
5. Import the GitHub repo into Vercel and set:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Transaction pooler |
| `DIRECT_URL` | Session pooler |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `APP_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key |

6. Deploy.

The secret key stays on the server only. Attachment downloads go through `/api/attachments/[id]` after session and tenant checks.
