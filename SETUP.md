# Fanverse — Setup Guide

## Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL database
- Stripe account
- n8n instance (for AI workflows)

## Environment Variables

Create a `.env` file at the root:

```env
# Database
POSTGRES_URL=postgresql://user:pass@host:5432/fanverse

# Auth
AUTH_SECRET=your-jwt-secret-here

# App
BASE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PRICE_SUB_PRO=price_xxx          # Fanverse Pro monthly subscription
STRIPE_PRICE_CREDITS_S=price_xxx        # Starter Pack (50 credits) - $4.99
STRIPE_PRICE_CREDITS_M=price_xxx        # Creator Pack (200 credits) - $14.99
STRIPE_PRICE_CREDITS_L=price_xxx        # Pro Pack (500 credits) - $29.99

# n8n
N8N_CALLBACK_SECRET=a-strong-shared-secret

# AI Provider Keys (used by n8n, stored here for reference)
NANOBANANA_API_KEY=
KLING_API_KEY=
GROK_API_KEY=
SEEDREAM_API_KEY=
```

## Stripe Setup

1. Create products in Stripe Dashboard:
   - **Fanverse Pro** — recurring monthly subscription ($19/mo)
   - **Starter Pack** — one-time $4.99
   - **Creator Pack** — one-time $14.99
   - **Pro Pack** — one-time $29.99

2. Copy the Price IDs into your `.env`

3. Set up webhook endpoint in Stripe:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `checkout.session.completed`

## n8n Setup

1. Create workflows in n8n for each AI operation
2. Each workflow should have a **Webhook trigger** node
3. Store the webhook URLs in the `workflows` database table
4. Configure n8n to POST results back to `/api/n8n/callback` with:
   - Header: `x-n8n-secret: <N8N_CALLBACK_SECRET>`
   - Body: `{ "runId": <id>, "status": "succeeded"|"failed", "output": {...}, "error": "..." }`

## Database Setup

```bash
pnpm install
pnpm db:generate    # Generate migrations
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed initial data
```

## Development

```bash
pnpm dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy!

## Architecture

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Custom JWT (bcrypt + jose)
- **Payments:** Stripe (subscriptions + one-time)
- **UI:** Tailwind CSS 4 + shadcn/ui (Radix)
- **AI:** n8n webhooks with 4 providers (Nano Banana Pro, Kling, Grok Imagine, Seedream)
