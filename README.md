# Flashbillr Backend

> **Multi-tenant SaaS backend for fireworks retail** — powering storefront, POS, inventory, invoicing, and platform administration through a single, role-segregated REST API.

[![TypeScript](https://img.shields.io/badge/TypeScript-89.7%25-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Overview

Flashbillr is a production-grade backend built for a **multi-tenant fireworks store SaaS**. It serves three distinct frontend applications — a public storefront, a per-store admin panel, and a platform-level super admin dashboard — all from a single API with strict role-based access control.

Key characteristics:

- **Multi-tenancy** — stores are isolated at the data layer; each STOREADMIN only sees their own products, orders, customers, and analytics
- **Three-tier RBAC** — PUBLIC, STOREADMIN, and SUPERADMIN roles enforced via JWT middleware
- **Production-ready tooling** — Docker image, GitHub Actions CI, ESLint + TypeScript strict mode, Jest test suite, Swagger UI
- **Rich PDF generation** — price lists and invoices generated server-side with PDFKit
- **Scheduled jobs** — subscription expiry checks via node-cron
- **File handling** — multipart upload support via Multer, with image optimisation via Sharp

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript 5 |
| Framework | Express 4 |
| ORM | Prisma 5 (Postgres) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator + Joi |
| File uploads | Multer + Sharp |
| Email | Nodemailer + Mailgun.js |
| Storage | Firebase Admin SDK |
| Cache | ioredis (Redis) |
| PDF | PDFKit |
| Cron | node-cron |
| Logging | Winston |
| Security | Helmet, CORS, express-rate-limit |
| Docs | Swagger UI (JSDoc annotations) |
| Testing | Jest + ts-jest |
| Containerisation | Docker |
| CI | GitHub Actions |

---

## Architecture

```
flashbillr_backend/
├── src/
│   ├── routes/
│   │   ├── auth/           # Login, register, password reset
│   │   ├── public/         # Storefront — products, stores, guest orders
│   │   ├── storeadmin/     # Per-store — products, inventory, orders, POS, invoices
│   │   └── superadmin/     # Platform — stores, users, subscriptions, analytics
│   ├── middleware/          # JWT auth, role guards, rate limiting
│   ├── services/            # Business logic, PDF generation, email sending
│   ├── scripts/             # Subscription expiry cron jobs
│   └── server.ts            # Entry point
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Development seed data
├── .github/workflows/       # CI pipeline
└── Dockerfile
```

**Request flow:** Client → Rate limiter → Helmet/CORS → JWT middleware → Role guard → Route handler → Prisma → PostgreSQL

---

## API

The API is organised into four namespaces. A live Swagger UI is available at `/api-docs` when the server is running.

**Base URLs**
- Development: `http://localhost:3000`
- Production: `https://api.flashbillr.com`

All routes are prefixed with `/api`.

---

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/login` | No | Returns JWT + user object |
| POST | `/register` | No | Creates account, returns JWT |
| GET | `/profile` | JWT | Returns profile with store context |
| POST | `/forgot-password` | No | Sends reset email |
| POST | `/reset-password` | No | Consumes reset token |
| POST | `/change-password` | JWT | Updates password |

**Auth header for protected routes:**
```
Authorization: Bearer <token>
```

---

### Public Storefront — `/api/public` · `/api/publicOrders`

No authentication required (guest checkout supported).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/public/stores/{slug}` | Store info by slug |
| GET | `/public/products` | Product catalogue (search, category, pagination) |
| GET | `/public/categories` | Product categories |
| GET | `/public/health` | Health check |
| POST | `/publicOrders/orders` | Place order (guest or authenticated, supports payment screenshot upload) |
| GET | `/publicOrders/orders/{orderNumber}` | Order tracking |
| POST | `/publicOrders/orders/{orderNumber}/payment-screenshot` | Upload payment proof |
| GET/POST/PUT/DELETE | `/publicOrders/addresses` | Saved address management (auth required) |

**Guest order request (multipart/form-data):**
```json
{
  "items": "[{ \"productId\": \"...\", \"quantity\": 2 }]",
  "paymentMethod": "UPI",
  "guestName": "Aathi",
  "guestEmail": "aathi@example.com",
  "guestPhone": "9876543210",
  "address": "{ \"line1\": \"...\", \"city\": \"...\", \"pincode\": \"...\" }",
  "paymentScreenshot": "<file>"
}
```

**Order placed response:**
```json
{
  "message": "Order placed successfully",
  "orderNumber": "ORD123456",
  "orderId": "clx...",
  "trackingUrl": "/api/public/orders/track?orderNumber=ORD123456&email=..."
}
```

---

### Store Admin — `/api/storeadmin` *(STOREADMIN role)*

Full CRUD for a store's day-to-day operations. All endpoints scoped to the authenticated user's store.

**Dashboard**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard` | Orders, revenue, customer, stock summary + top products + low stock alerts |

**Products**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | List (search, category, pagination) |
| POST | `/products` | Create with image upload (`multipart/form-data`) |
| GET | `/products/:id` | Get by ID |
| PUT | `/products/:id` | Update |
| DELETE | `/products/:id` | Soft delete |

**Inventory**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/inventory` | List with `lowStock` filter |
| PUT | `/inventory/bulk` | Bulk stock update |
| GET | `/inventory/low-stock` | Low stock alerts |

**Orders**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/orders` | List (status filter, search, pagination) |
| POST | `/orders` | Create |
| GET | `/orders/:id` | Detail |
| PUT | `/orders/:id` | Update status / tracking |
| POST | `/orders/:id/ship` | Mark shipped, upload LR document (`lrPhoto`) |
| POST | `/orders/:id/cancel` | Cancel with reason |

**Customers**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/customers` | List with order history |
| POST | `/customers` | Create |
| GET | `/customers/:id` | Detail with nested order history |
| PUT | `/customers/:id` | Update |
| DELETE | `/customers/:id` | Delete |

**POS**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/pos` | Receipts and analytics |
| POST | `/pos` | Create receipt |
| POST | `/pos/checkout` | Complete POS checkout |
| GET | `/pos/:id` | Receipt by ID |

**Invoices & Notifications** — full list/get/create with mark-read support.

---

### Super Admin — `/api/superadmin` *(SUPERADMIN role)*

Platform-level management across all tenants.

**Dashboard**

```json
{
  "summary": { "totalStores": 12, "activeStores": 10, "totalOrders": 4820, "totalRevenue": 1240000 },
  "monthlyRevenue": [...],
  "topStores": [...],
  "recentOrders": [...]
}
```

**Stores** — full CRUD + `POST /:id/price-list` to generate and email a PDF price list.

**Users** — list all, create store admin (sends onboarding email), toggle active status, soft delete.

**Subscriptions**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/subscriptions` | All subscriptions |
| POST | `/subscriptions` | Create |
| GET | `/subscriptions/store/:storeId` | By store |
| PATCH | `/subscriptions/:id/status` | Set ACTIVE / EXPIRED / CANCELLED |
| GET | `/subscriptions/expiring` | Expiring within 30 days |

---

### Error Format

All errors return JSON with a standard shape:

```json
{ "error": "Error message" }
```

Common codes: `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `409` Conflict · `429` Rate Limited · `500` Server Error

### Rate Limiting

100 requests per 15 minutes per IP. Exceeding returns `429`.

### Pagination

All list endpoints accept `?page=1&limit=20` and return:
```json
{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 } }
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional, for caching)

### Local Setup

```bash
# Clone the repo
git clone https://github.com/Aathirajan/flashbillr_backend.git
cd flashbillr_backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DB, JWT secret, Mailgun, Firebase credentials

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start development server (hot reload)
npm run dev
```

Server runs at `http://localhost:3000`. Swagger UI available at `http://localhost:3000/api-docs`.

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/flashbillr
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000

# Email
MAILGUN_API_KEY=
MAILGUN_DOMAIN=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

### Docker

```bash
docker build -t flashbillr-backend .
docker run -p 3000:3000 --env-file .env flashbillr-backend
```

### Scripts

```bash
npm run dev            # Development with hot reload
npm run build          # Compile TypeScript
npm run start          # Production (requires build)
npm run test           # Run Jest test suite
npm run lint           # ESLint
npm run db:migrate     # Run Prisma migrations
npm run db:studio      # Open Prisma Studio
npm run db:seed        # Seed database
npm run check-subscriptions  # Run subscription expiry check manually
```

---

## Key Design Decisions

**Multi-tenancy via Prisma scoping** — every store-admin query is filtered by `storeId` derived from the JWT. There's no risk of cross-store data leaks without a code change.

**Soft deletes** — users, stores, and products are never hard-deleted, preserving referential integrity for orders and audit trails.

**PDF generation on-the-fly** — PDFKit streams price lists and invoices directly; no temp files or external services.

**Cron-based subscription management** — `node-cron` runs a daily job to flag expiring and expired subscriptions and trigger notification emails, keeping SaaS billing status accurate without manual intervention.

**Rate limiting at the Express layer** — `express-rate-limit` protects all routes (100 req/15 min/IP) before any DB or business logic runs.

---

## License

MIT © [Aathirajan](https://github.com/Aathirajan)
