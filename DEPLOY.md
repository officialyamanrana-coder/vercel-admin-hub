# Deploying APK WORLD to Vercel

The app is a TanStack Start project. Its Nitro output is explicitly configured
for Vercel in `vite.config.ts`.

## 1. Get the code to GitHub

In Lovable: **GitHub → Connect / Push to GitHub**.

## 2. Import into Vercel

1. vercel.com → **Add New… → Project** → import the repo.
2. Framework preset: **Other** (leave defaults).
3. Build command: `npm run build` — Output: leave empty (Nitro handles it).
4. Do not override `NITRO_PRESET` or `SERVER_PRESET` in Vercel.

## 3. Environment variables (Vercel → Settings → Environment Variables)

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | backend URL (same value used in this project) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable key |
| `VITE_SUPABASE_PROJECT_ID` | project id |
| `SUPABASE_URL` | same as `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key of your own backend project |
| `SESSION_SECRET` | any long random string (`openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | `Ya@010108` (or your replacement password) |
| `TELEGRAM_BOT_TOKEN` | optional — enables real Telegram membership checks |

> Note: on Lovable Cloud the service-role key is managed for you and is not
> retrievable. To host on Vercel you need your own backend project (or a
> self-managed Supabase project) whose service-role key you control, and run the
> SQL in `supabase/migrations/` against it once.

## 4. Deploy

Push to `main` → Vercel builds and deploys. Admin panel lives at `/admin`.

## Telegram bot (optional but recommended)

1. Create a bot with @BotFather, copy the token into `TELEGRAM_BOT_TOKEN`.
2. Add the bot as an **admin** in each channel.
3. In the admin panel, fill each channel's **chat id** (e.g. `-1001234567890`).

Without a bot token the gate falls back to click-through + dwell-time verification.
