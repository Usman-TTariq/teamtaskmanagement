# TGT Nexus — Team Tasks Manager

Production version of the [Claude artifact](https://claude.ai/public/artifacts/acc66cc8-bf4e-4e70-bc20-9a9b9be38047) task manager.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Auth, Postgres, RLS)

## Setup

1. Copy env file:

```bash
cp .env.local.example .env.local
```

2. Create a Supabase project and add credentials to `.env.local`.

3. Run the migration in Supabase SQL Editor (or via CLI):

```
supabase/migrations/20250622000000_initial_schema.sql
```

4. Enable Email auth in Supabase Dashboard (Authentication → Providers → Email).

5. **Email sign-in (required):** Supabase Dashboard:
   - **Authentication → URL Configuration → Redirect URLs:** add `http://localhost:3003/auth/callback`
   - **Authentication → SMTP Settings:** configure SMTP for `@tgtnexus.net` (Microsoft 365 / Outlook). Without this, sign-in emails won't reach inboxes.

6. Start dev server:

```bash
npm run dev
```

6. Open [http://localhost:3000/login](http://localhost:3000/login)

Tap a team email chip to fill the address, click **Send sign-in link**, then open the link from your Outlook inbox to sign in.

## Team (seeded in migration)

| Email | Role |
|-------|------|
| abdullah.zahid@tgtnexus.net | Manager |
| gufran.ahmed@tgtnexus.net | Team Lead |
| yasal.khan@tgtnexus.net | Developer |
| usman.tariq@tgtnexus.net | Developer |
| hammad.noor@tgtnexus.net | Designer |
| daniyal.naveed@tgtnexus.net | SEO |

## Phases

- **Phase 1 (current):** Auth, role-based nav, app shell
- **Phase 2:** Task CRUD, My/All tasks
- **Phase 3:** Kanban, Team view, Dashboard
- **Phase 4:** Files, Settings, deploy
