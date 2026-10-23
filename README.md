# Flashbillr Backend

REST API for Flashbillr, a multi-tenant billing/POS and e-commerce platform. It powers the storefront, POS, inventory, invoicing and platform administration, with role-separated access (store admin / super admin). Built with Node.js, Express, TypeScript and Prisma on PostgreSQL.

## How to run

Prerequisites: Node.js 18+, PostgreSQL. Redis is optional (caching).

```bash
npm install
# create .env with at least:
#   DATABASE_URL=postgresql://user:password@localhost:5432/flashbillr
#   JWT_SECRET=...
#   FRONTEND_URL=...
# optional: MAILGUN_API_KEY, MAILGUN_DOMAIN, FIREBASE_PROJECT_ID,
#   FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, REDIS_URL
npm run db:migrate   # apply migrations
npm run db:seed      # seed dev data
npm run dev          # dev server with hot reload (http://localhost:3000)
npm test             # run tests
npm run build && npm start   # production
```

Docker: `docker build -t flashbillr-backend .`

License: MIT
