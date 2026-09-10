# RateQ Pro

Independent business administration and financial management product under the RateQ brand.

This is **not** connected to the existing RateQ application.

## Stack

- **App:** Next.js on Vercel
- **Database + files:** Supabase (Postgres + private Storage)
- **ORM:** Prisma, tenant-scoped (`companyId` on every company record)
- **Auth:** custom sessions (not Supabase Auth)
- **Database access:** Prisma only. Public tables have Row-Level Security enabled with no anon/authenticated policies, so the Supabase API keys cannot read or write business data.

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

This folder is not a git repo yet. Vercel deploys from GitHub (or GitLab / Bitbucket).

### 1. Put the project on GitHub

```bash
git init
git add .
git commit -m "Initial RateQ Pro"
```

Create an empty GitHub repository, then:

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Do not commit `.env`. It is already in `.gitignore`.

### 2. Import the repo in Vercel

1. Open [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. Framework preset: **Next.js**. Root directory: `.`
3. Before the first deploy, add environment variables (Production + Preview):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Same transaction pooler URI as local `.env` (port **6543**, `pgbouncer=true`) |
| `DIRECT_URL` | Same session pooler URI as local `.env` (port **5432**) |
| `AUTH_SECRET` | `openssl rand -base64 32` (use a new value for production) |
| `APP_URL` | Your Vercel URL, e.g. `https://rateq-pro.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key |

If the database password contains `@`, `/`, `$`, or `!`, keep it URL-encoded in both Postgres URIs.

4. Deploy. The build runs `prisma migrate deploy && next build`, so later schema changes apply on each production build.

5. After the first deploy, set `APP_URL` to the real `*.vercel.app` URL (or your custom domain) and redeploy if you guessed it.

The secret key stays on the server only. Attachment downloads go through `/api/attachments/[id]` after session and tenant checks.
