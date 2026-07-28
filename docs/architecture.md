# Production Architecture

```mermaid
flowchart LR
  U["User Browser"] --> FE["Next.js App Router UI"]
  FE --> API["Next.js API Routes"]
  API --> AUTH["Supabase Auth"]
  API --> DB["Supabase Postgres + RLS"]
  API --> RL["Upstash Redis Rate Limit"]
  API --> STRIPE["Stripe Checkout"]
  STRIPE --> WH["/api/stripe/webhook"]
  WH --> DB
  API --> JOB["manifestation_jobs"]
  JOB --> MAKE["Make.com Workflow"]
  MAKE --> CB["/api/make/manifestation/callback"]
  CB --> DB
  FE --> POLL["/api/make/manifestation/status"]
  POLL --> DB
  API --> SENTRY["Sentry"]
  ADMIN["Admin Dashboard"] --> ADMINAPI["/api/admin/*"]
  ADMINAPI --> DB
```

## Async Make Flow

1. User submits manifestation request.
2. API authenticates, validates, rate-limits, and reserves quota or paid entitlement.
3. API creates `manifestation_jobs` row.
4. API triggers Make with `jobId`, `callbackUrl`, and `callbackSecret`.
5. API returns `202` with `jobId`.
6. Frontend polls `/api/make/manifestation/status`.
7. Make posts result to `/api/make/manifestation/callback`.
8. Callback finalizes manifestation, stores result, and marks job completed.

