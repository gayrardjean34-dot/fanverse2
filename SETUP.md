# Fanverse — Setup Guide

## Environment Variables

Add these to your Vercel project (or `.env` locally):

### Database
```
POSTGRES_URL=postgresql://user:pass@host:5432/fanverse
```

### Auth
```
AUTH_SECRET=your-random-secret-at-least-32-chars
```

### App
```
BASE_URL=https://your-domain.vercel.app
```

### Stripe
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Price IDs (set after creating products in Stripe)
```
STRIPE_PRICE_CREDITS_S=price_...   # 50 credits one-time
STRIPE_PRICE_CREDITS_M=price_...   # 200 credits one-time
STRIPE_PRICE_CREDITS_L=price_...   # 500 credits one-time
```

### n8n Integration
```
N8N_CALLBACK_SECRET=your-shared-secret-for-n8n
N8N_DEFAULT_TIMEOUT_MS=30000
```

### AI Provider Keys (used by n8n, stored here for reference)
```
NANOBANANA_API_KEY=...
KLING_API_KEY=...
GROK_API_KEY=...
SEEDREAM_API_KEY=...
```

## Stripe Setup

1. Create a **subscription product** (e.g., "Plus" at $12/month)
2. Create **3 one-time products** for credit packs:
   - Pack S: 50 credits
   - Pack M: 200 credits
   - Pack L: 500 credits
3. Set the price IDs in env vars (`STRIPE_PRICE_CREDITS_S`, etc.)
4. Add webhook endpoint: `https://your-domain/api/stripe/webhook`
   - Events to listen for:
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `checkout.session.completed`

## n8n Setup

1. For each workflow, create a **webhook trigger** in n8n
2. The webhook will receive: `{ runId, userId, workflowSlug, model, inputs }`
3. At the end of the n8n workflow, add an **HTTP Request** node that calls back:
   - URL: `https://your-domain/api/n8n/callback`
   - Method: POST
   - Headers: `x-n8n-secret: <your N8N_CALLBACK_SECRET>`
   - Body: `{ runId, status: "succeeded"|"failed", output: {...}, error: "..." }`

## Database

```bash
# Generate migration after schema changes
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed initial data (Stripe products + test user)
pnpm db:seed
```

## Local Development

```bash
pnpm install
pnpm dev
```

## Adding Workflows

Insert rows into the `workflows` table:
```sql
INSERT INTO workflows (slug, name, description, credit_cost, n8n_webhook_url, allowed_models, input_schema)
VALUES (
  'image-gen',
  'Image Generation',
  'Generate images from text prompts',
  5,
  'https://your-n8n.com/webhook/abc123',
  '["nano-banana-pro", "grok-imagine", "seedream"]',
  '{"prompt": {"label": "Prompt", "placeholder": "Describe your image..."}}'
);
```
