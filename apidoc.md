# Flashbillr API Documentation

This document provides a comprehensive reference for integrating with the Flashbillr backend API. It covers all endpoints, authentication, request/response formats, error handling, and integration requirements for frontend and AI clients.

---

## Base URLs
- **Development:** `http://localhost:3000`
- **Production:** `https://api.flashbillr.com`

All endpoints are prefixed with `/api`.

---

## Authentication
- **Scheme:** Bearer JWT
- **Header:** `Authorization: Bearer <token>`
- Obtain token via `/api/auth/login`.
- Some endpoints (e.g., `/public`) are open; most require authentication.

---

## Common Headers
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (where required)
- CORS: Allowed origins set via `FRONTEND_URL` env var (default: `http://localhost:3000`)

---

## Error Handling
- Errors are returned as JSON:
  ```json
  { "error": "Error message" }
  ```
- Validation errors:
  ```json
  { "error": "Validation error details" }
  ```
- Standard HTTP status codes are used (400, 401, 403, 404, 429, 500, etc).

---

## Rate Limiting
- 100 requests per 15 minutes per IP.
- Exceeding returns 429:
  ```json
  { "error": "Too many requests from this IP, please try again later." }
  ```

---

## Endpoints Overview

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login and receive JWT
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Reset password with token
- `GET /api/auth/profile` — Get current user profile (auth required)

### Public (`/api/public`)
- Publicly accessible endpoints for store/product discovery

### Store Admin (`/api/storeadmin`)
- All endpoints require authentication as store admin
- Subroutes:
  - `/dashboard` — Store analytics, stats
  - `/products` — CRUD for products
  - `/inventory` — Inventory management
  - `/customers` — Customer management
  - `/orders` — Order management
  - `/pos` — POS operations
  - `/invoices` — Invoice management

### Super Admin (`/api/superadmin`)
- All endpoints require authentication as superadmin
- Subroutes:
  - `/stores` — Manage stores
  - `/users` — Manage users
  - `/dashboard` — Platform analytics
  - `/subscriptions` — Manage subscriptions

---

## Endpoint Details

### Authentication

#### Register
- **POST** `/api/auth/register`
- **Body:**
  ```json
  {
    "email": "string",
    "password": "string",
    "firstName": "string",
    "lastName": "string"
  }
  ```
- **Response:**
  - 201 Created, user object
  - 400/409 on error

#### Login
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response:**
  - 200 OK, `{ "token": "JWT", "user": { ... } }`
  - 401 on invalid credentials

#### Forgot Password
- **POST** `/api/auth/forgot-password`
- **Body:** `{ "email": "string" }`
- **Response:** 200 OK (email sent)

#### Reset Password
- **POST** `/api/auth/reset-password`
- **Body:**
  ```json
  {
    "token": "string",
    "newPassword": "string"
  }
  ```
- **Response:** 200 OK (password reset)

#### Get Profile
- **GET** `/api/auth/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "user": {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "string",
      "isActive": true,
      "createdAt": "datetime",
      "store": { "id": "string", "name": "string", "slug": "string", "brandColor": "string" }
    }
  }
  ```

---

## Store Admin Endpoints

### Products (`/api/storeadmin/products`)
- **GET** `/` — List products
- **POST** `/` — Create product
- **GET** `/:id` — Get product by ID
- **PUT** `/:id` — Update product
- **DELETE** `/:id` — Soft delete product

### Inventory (`/api/storeadmin/inventory`)
- **GET** `/` — List inventory
- **POST** `/bulk-update` — Bulk update inventory

### Customers (`/api/storeadmin/customers`)
- **GET** `/` — List customers (pagination supported)
- **POST** `/` — Create customer
- **GET** `/:id` — Get customer by ID
- **PUT** `/:id` — Update customer
- **DELETE** `/:id` — Soft delete customer

### Orders (`/api/storeadmin/orders`)
- **GET** `/` — List orders
- **POST** `/` — Create order
- **GET** `/:id` — Get order by ID
- **PUT** `/:id` — Update order
- **POST** `/:id/ship` — Mark order as shipped (file upload: `lrPhoto`)
- **POST** `/:id/cancel` — Cancel order (body: `{ "reason": "string" }`)

### POS (`/api/storeadmin/pos`)
- **POST** `/checkout` — Complete POS checkout

### Invoices (`/api/storeadmin/invoices`)
- **GET** `/` — List invoices
- **POST** `/` — Create invoice

---

## Super Admin Endpoints

### Stores (`/api/superadmin/stores`)
- **GET** `/` — List stores
- **POST** `/` — Create store
- **GET** `/:id` — Get store by ID
- **PUT** `/:id` — Update store
- **DELETE** `/:id` — Soft delete store

### Users (`/api/superadmin/users`)
- **GET** `/` — List users
- **POST** `/` — Create user
- **GET** `/:id` — Get user by ID
- **PUT** `/:id` — Update user
- **DELETE** `/:id` — Soft delete user

### Subscriptions (`/api/superadmin/subscriptions`)
- **GET** `/` — List subscriptions
- **POST** `/` — Create subscription
- **GET** `/store/:storeId` — List subscriptions for a store

---

## Public Endpoints (`/api/public`)
- **GET** `/stores` — List public stores
- **GET** `/products` — List public products

---

## File Uploads
- Some endpoints accept file uploads (e.g., `/api/storeadmin/orders/:id/ship` expects `multipart/form-data` with `lrPhoto` field).
- Use standard file upload mechanisms from frontend.

---

## Pagination
- List endpoints support pagination via query params:
  - `?page=1&limit=20`
- Response includes pagination metadata:
  ```json
  {
    "data": [...],
    "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
  }
  ```

---

## Integration Notes
- All endpoints return JSON.
- Use JWT tokens for all authenticated requests.
- Handle 401/403 errors by redirecting to login or showing an error.
- For file uploads, use `multipart/form-data` and supply required fields.
- For rate-limiting, inform users to retry after cooldown.
- Use provided error messages for user feedback.

---

## Environment Variables (Frontend/AI Integration)
- `FRONTEND_URL` — Allowed CORS origin
- `BACKEND_URL` — Backend API base URL

---

## API Docs UI
- Interactive Swagger UI available at `/api-docs` when backend is running.

---

For any further integration questions, contact the backend team at support@flashbillr.com.
