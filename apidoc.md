# Flashbillr API Documentation

## Project Overview

Flashbillr is a backend system powering a multi-tenant retail platform, supporting three main frontend applications:

- **Crackers Storefront**: The public-facing e-commerce site where customers can browse products, place orders, and track their purchases. This uses public and guest endpoints (e.g., `/api/publicOrders`).
- **Store Admin Panel**: Used by individual store managers to manage products, inventory, orders, POS, and customer data for their specific store. These endpoints are namespaced under `/api/storeadmin/*` and require store admin authentication.
- **Super Admin Panel**: Used by platform administrators to manage all stores, users, subscriptions, and platform-wide settings. These endpoints are under `/api/superadmin/*` and require super admin authentication.

Each frontend authenticates using JWT tokens (except public endpoints). The API is organized to clearly separate access and permissions for each role.

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

## API Endpoint Groups

### 1. Crackers Storefront (Public Endpoints)

#### Orders
- **POST** `/api/public/orders` — Place an order as guest or authenticated user.
  - **Body (multipart/form-data):**
    - `items`: JSON stringified array of order items
    - `paymentMethod`: string
    - `guestName`, `guestEmail`, `guestPhone`: strings (for guest checkout)
    - `address`: JSON stringified address object
    - `addressId`: string (if using saved address)
    - `paymentScreenshot`: file (optional, proof of payment)
  - **Returns:** `201 Created` with order details and tracking URL
  - **Example Response:**
    ```json
    {
      "message": "Order placed successfully",
      "orderNumber": "ORD123456",
      "orderId": "clx...",
      "trackingUrl": "/api/public/orders/track?orderNumber=ORD123456&email=...",
      "order": { ... }
    }
    ```

- **GET** `/api/public/orders/track` — Track an order by order number and email/phone (guest) or userId (auth).
  - **Query:** `orderNumber`, `email` or `phone` (guests), or `userId` (auth)

- **GET** `/api/public/orders/guest-history` — Get past orders for a guest user (by email/phone)

#### Public Data
- **GET** `/api/public/stores` — List all public stores
- **GET** `/api/public/products` — List all public products

---

### 2. Store Admin Panel (`/api/storeadmin`)
> All endpoints require authentication as a store admin (`Authorization: Bearer <token>`)

#### Dashboard
- **GET** `/api/storeadmin/dashboard` — Store analytics, sales, inventory, and product stats

#### Products
- **GET** `/api/storeadmin/products` — List products for the store
- **POST** `/api/storeadmin/products` — Add a new product
- **PUT** `/api/storeadmin/products/:id` — Update a product
- **DELETE** `/api/storeadmin/products/:id` — Soft delete a product

#### Inventory
- **GET** `/api/storeadmin/inventory` — List inventory items
- **POST** `/api/storeadmin/inventory/bulk-update` — Bulk update inventory
- **GET** `/api/storeadmin/inventory/low-stock` — List low stock items and trigger notifications

#### Orders
- **GET** `/api/storeadmin/orders` — List orders for the store
- **PUT** `/api/storeadmin/orders/:id/ship` — Mark order as shipped (accepts file upload: `lrPhoto`)

#### Customers
- **GET** `/api/storeadmin/customers` — List store customers

#### POS
- **GET** `/api/storeadmin/pos` — POS receipts and analytics

#### Invoices
- **GET** `/api/storeadmin/invoices` — List invoices for the store

---

### 3. Super Admin Panel (`/api/superadmin`)
> All endpoints require authentication as a super admin (`Authorization: Bearer <token>`)

#### Stores
- **GET** `/api/superadmin/stores` — List all stores
- **POST** `/api/superadmin/stores` — Create a new store
- **GET** `/api/superadmin/stores/:id` — Get store details
- **PUT** `/api/superadmin/stores/:id` — Update store
- **DELETE** `/api/superadmin/stores/:id` — Soft delete store
- **POST** `/api/superadmin/stores/:id/price-list` — Generate and download store price list PDF

#### Users
- **GET** `/api/superadmin/users` — List all users
- **POST** `/api/superadmin/users/store-admin` — Create a store admin user
- **GET** `/api/superadmin/users/:id` — Get user by ID
- **PUT** `/api/superadmin/users/:id` — Update user
- **DELETE** `/api/superadmin/users/:id` — Soft delete user

#### Subscriptions
- **GET** `/api/superadmin/subscriptions` — List all subscriptions
- **POST** `/api/superadmin/subscriptions` — Create a subscription
- **GET** `/api/superadmin/subscriptions/store/:storeId` — List subscriptions for a store

#### Dashboard
- **GET** `/api/superadmin/dashboard` — Platform-wide analytics

---

### 4. File Uploads
- Endpoints expecting files use `multipart/form-data`.
- For orders: `paymentScreenshot` (public), `lrPhoto` (storeadmin).
- Max file size: 5MB.

---

### 5. Authentication
- Most endpoints require Bearer JWT (`Authorization: Bearer <token>`).
- Public endpoints (storefront) do not require authentication.

---

### 6. Error Handling
- All errors are returned as JSON:
  ```json
  { "error": "Error message" }
  ```
- Validation errors:
  ```json
  { "error": "Validation error details" }
  ```
- Standard HTTP status codes are used.

---

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
