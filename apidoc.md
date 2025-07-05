# Flashbillr Backend API Documentation

---

## Table of Contents
- [AUTH](#auth)
- [STORE ADMIN](#store-admin)
- [SUPER ADMIN](#super-admin)
- [PUBLIC ENDPOINTS (Storefront)](#public-endpoints-storefront)
- [Error Handling](#error-handling)
- [Authentication](#authentication)

---

## AUTH

### Overview
Authentication and user account management endpoints. All endpoints are under `/api/auth/*`.

### Endpoints

#### POST `/api/auth/login`
- **Summary:** User login
- **Auth Required:** No
- **Request Body:**
  - `email` (string, required)
  - `password` (string, required)
- **Response:**
  - `token` (string, JWT)
  - `user` (object: id, email, firstName, lastName, role, etc.)
- **Errors:** 401 (Invalid credentials)

#### POST `/api/auth/register`
- **Summary:** User registration
- **Auth Required:** No
- **Request Body:**
  - `email`, `password`, `firstName`, `lastName`, `storeId` (all required)
- **Response:**
  - `token`, `user`
- **Errors:** 409 (Email already exists)

#### POST `/api/auth/forgot-password`
- **Summary:** Request password reset
- **Auth Required:** No
- **Request Body:**
  - `email` (string, required)
- **Response:**
  - `message` (string)

#### POST `/api/auth/reset-password`
- **Summary:** Reset password
- **Auth Required:** No
- **Request Body:**
  - `token` (string, required)
  - `newPassword` (string, required)
- **Response:**
  - `message` (string)
- **Errors:** 400 (Invalid or expired token)

#### POST `/api/auth/change-password`
- **Summary:** Change password
- **Auth Required:** Yes (JWT)
- **Request Body:**
  - `oldPassword` (string, required)
  - `newPassword` (string, required)
- **Response:**
  - `message` (string)
- **Errors:** 401 (Invalid credentials)

---

## STORE ADMIN

### Overview
Endpoints for store management, accessible to users with STOREADMIN role. All endpoints are under `/api/storeadmin/*` and require JWT Bearer authentication.

### Customers
#### GET `/api/storeadmin/customers`
- **Summary:** List customers (with filters, pagination)
- **Query Params:** `search`, `page`, `limit`, `sort`
- **Response:** Array of customer objects (id, name, email, phone, orderHistory, etc.)

#### POST `/api/storeadmin/customers`
- **Summary:** Create customer
- **Request Body:** Customer fields (name, email, phone, etc.)
- **Response:** Created customer object

#### GET `/api/storeadmin/customers/{id}`
- **Summary:** Get customer by ID (with order history)
- **Response:** Customer object with nested order history

#### PUT `/api/storeadmin/customers/{id}`
- **Summary:** Update customer
- **Request Body:** Any updatable customer fields
- **Response:** Updated customer object

#### DELETE `/api/storeadmin/customers/{id}`
- **Summary:** Delete customer
- **Response:** Success message

### Dashboard
#### GET `/api/storeadmin/dashboard`
- **Summary:** Get store dashboard analytics
- **Response:**
  - `summary` (orders, revenue, customers, stock)
  - `recentOrders`, `recentReceipts`, `topProducts`, `lowStockProducts`

### Inventory
#### GET `/api/storeadmin/inventory`
- **Summary:** List inventory (filters, pagination)
- **Query Params:** `lowStock`, `search`, `page`, `limit`
- **Response:** Array of inventory items

#### PUT `/api/storeadmin/inventory/bulk`
- **Summary:** Bulk update inventory
- **Request Body:** Array of `{ productId, stock, ... }`
- **Response:** Updated inventory items

### Invoices
#### GET `/api/storeadmin/invoices`
- **Summary:** List invoices (filters, pagination)
- **Response:** Array of invoices

#### GET `/api/storeadmin/invoices/{id}`
- **Summary:** Get invoice by ID
- **Response:** Invoice object

### Notifications
#### GET `/api/storeadmin/notifications`
- **Summary:** Get notifications for logged-in store admin
- **Response:** Array of notifications

#### POST `/api/storeadmin/notifications/mark-read`
- **Summary:** Mark notifications as read
- **Request Body:** Array of notification IDs
- **Response:** Success message

### Orders
#### GET `/api/storeadmin/orders`
- **Summary:** List orders (filters, pagination)
- **Query Params:** `status`, `search`, `page`, `limit`
- **Response:** Array of order objects

#### POST `/api/storeadmin/orders`
- **Summary:** Create order
- **Request Body:** Order fields (customer, products, amounts, etc.)
- **Response:** Created order object

#### GET `/api/storeadmin/orders/{id}`
- **Summary:** Get order by ID
- **Response:** Order object with details

#### PUT `/api/storeadmin/orders/{id}`
- **Summary:** Update order status
- **Request Body:** `status`, `trackingInfo`, etc.
- **Response:** Updated order object

#### POST `/api/storeadmin/orders/{id}/ship`
- **Summary:** Mark order as shipped (with file upload)
- **Request:** `multipart/form-data` with shipping document
- **Response:** Updated order object

### POS
#### GET `/api/storeadmin/pos`
- **Summary:** List POS receipts (filters, pagination)
- **Response:** Array of POS receipts

#### POST `/api/storeadmin/pos`
- **Summary:** Create POS receipt
- **Request Body:** Receipt fields (products, amounts, discounts, etc.)
- **Response:** Created POS receipt object

#### GET `/api/storeadmin/pos/{id}`
- **Summary:** Get POS receipt by ID
- **Response:** POS receipt object

### Products
#### GET `/api/storeadmin/products`
- **Summary:** List products (filters, pagination)
- **Query Params:** `search`, `category`, `page`, `limit`
- **Response:** Array of product objects

#### POST `/api/storeadmin/products`
- **Summary:** Create product (with image upload)
- **Request:** `multipart/form-data` with product fields and image file
- **Response:** Created product object

#### GET `/api/storeadmin/products/{id}`
- **Summary:** Get product by ID
- **Response:** Product object

#### PUT `/api/storeadmin/products/{id}`
- **Summary:** Update product
- **Request Body:** Updatable product fields
- **Response:** Updated product object

---

## SUPER ADMIN

### Overview
Platform-level admin endpoints. All endpoints are under `/api/superadmin/*` and require JWT Bearer authentication with SUPERADMIN role.

### Dashboard
#### GET `/api/superadmin/dashboard`
- **Summary:** Get analytics for all stores
- **Response:**
  - `summary` (totalStores, activeStores, totalOrders, totalRevenue)
  - `monthlyRevenue` (array by month)
  - `topStores` (top 5 by revenue)
  - `recentOrders` (last 10 orders)

### Stores
#### GET `/api/superadmin/stores`
- **Summary:** List all stores (with user/order/product counts)
- **Response:** Array of store objects

#### GET `/api/superadmin/stores/{id}`
- **Summary:** Get store by ID (with users and counts)
- **Response:** Store object with nested users and counts

#### POST `/api/superadmin/stores`
- **Summary:** Create store
- **Request Body:** Store fields (name, slug, email, phone, address, isActive)
- **Response:** Created store object
- **Errors:** 409 (Slug already exists)

#### PUT `/api/superadmin/stores/{id}`
- **Summary:** Update store
- **Request Body:** Updatable store fields
- **Response:** Updated store object

#### POST `/api/superadmin/stores/{id}/price-list`
- **Summary:** Generate and send price list PDF
- **Request:** `multipart/form-data` (if uploading logo)
- **Response:** Success message, PDF URL

### Subscriptions
#### GET `/api/superadmin/subscriptions`
- **Summary:** List all subscriptions (with store info)
- **Response:** Array of subscription objects

#### GET `/api/superadmin/subscriptions/store/{storeId}`
- **Summary:** List subscriptions for a store
- **Response:** Array of subscription objects

#### POST `/api/superadmin/subscriptions`
- **Summary:** Create subscription
- **Request Body:** `storeId`, `startDate`, `endDate`, `amount`, `notes`
- **Response:** Created subscription object
- **Errors:** 404 (Store not found)

#### PATCH `/api/superadmin/subscriptions/{id}/status`
- **Summary:** Update subscription status
- **Request Body:** `status` (ACTIVE, EXPIRED, CANCELLED)
- **Response:** Updated subscription object

#### GET `/api/superadmin/subscriptions/expiring`
- **Summary:** List subscriptions expiring in 30 days
- **Response:** Array of subscription objects

### Users
#### GET `/api/superadmin/users`
- **Summary:** List all users (with store info)
- **Response:** Array of user objects (id, email, name, role, store, createdAt, isActive)

#### POST `/api/superadmin/users/store-admin`
- **Summary:** Create store admin user (send onboarding email)
- **Request Body:** `email`, `firstName`, `lastName`, `storeId`
- **Response:** Success message, user object
- **Errors:** 409 (User already exists), 404 (Store not found or unauthorized)

#### PATCH `/api/superadmin/users/{id}/toggle-status`
- **Summary:** Toggle user active status
- **Response:** Success message, user object
- **Errors:** 404 (User not found)

#### DELETE `/api/superadmin/users/{id}`
- **Summary:** Soft delete user
- **Response:** Success message
- **Errors:** 404 (User not found), 403 (Cannot delete superadmin)

---

## PUBLIC ENDPOINTS (Storefront)

### Overview
Endpoints for public/guest users and storefront browsing. All endpoints are under `/api/public/*` or `/api/publicOrders/*`. Most do not require authentication unless otherwise noted.

### General
#### GET `/api/public/info`
- **Summary:** Get project info
- **Response:** Project metadata

#### GET `/api/public/health`
- **Summary:** Health check
- **Response:** `{ status: 'ok' }`

### Stores & Products
#### GET `/api/public/stores/{slug}`
- **Summary:** Get store info by slug
- **Response:** Store object

#### GET `/api/public/products`
- **Summary:** List products (filters, pagination)
- **Query Params:** `search`, `category`, `page`, `limit`
- **Response:** Array of product objects

#### GET `/api/public/categories`
- **Summary:** List product categories
- **Response:** Array of categories

### Orders (Guest & Authenticated)
#### POST `/api/publicOrders/orders`
- **Summary:** Place order (guest or authenticated)
- **Request:** `multipart/form-data` (for payment screenshot)
- **Fields:** Customer info, products, address, payment details, file upload (optional)
- **Response:** Created order object

#### GET `/api/publicOrders/orders/{orderNumber}`
- **Summary:** Track order by order number
- **Response:** Order object with status, items, payment info

#### POST `/api/publicOrders/orders/{orderNumber}/payment-screenshot`
- **Summary:** Upload payment screenshot for order
- **Request:** `multipart/form-data` with image file
- **Response:** Success message, updated order

#### GET `/api/publicOrders/addresses`
- **Summary:** List addresses (authenticated)
- **Auth Required:** Yes
- **Response:** Array of address objects

#### POST `/api/publicOrders/addresses`
- **Summary:** Add address (authenticated)
- **Auth Required:** Yes
- **Request Body:** Address fields
- **Response:** Created address object

#### PUT `/api/publicOrders/addresses/{id}`
- **Summary:** Update address (authenticated)
- **Auth Required:** Yes
- **Request Body:** Updatable address fields
- **Response:** Updated address object

#### DELETE `/api/publicOrders/addresses/{id}`
- **Summary:** Delete address (authenticated)
- **Auth Required:** Yes
- **Response:** Success message

---

## Error Handling
- All endpoints return standard HTTP status codes.
- Error responses have the format:
  ```json
  {
    "error": {
      "message": "Error description",
      "code": 400
    }
  }
  ```
- Common codes: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Server Error)

## Authentication
- Protected endpoints require JWT Bearer token in `Authorization` header:
  `Authorization: Bearer <token>`
- Roles: `STOREADMIN`, `SUPERADMIN`
- Some endpoints require role-based access (see section headers)

## Special Notes
- File uploads use `multipart/form-data` (see product image and payment screenshot endpoints)
- Pagination: Most list endpoints accept `page` and `limit` query params
- Filtering: Many endpoints support `search` and filter query params
- All request/response schemas are strictly validated; see Swagger/OpenAPI annotations in code for full details

---

This documentation is generated directly from the backend codebase and is guaranteed to be accurate for AI and frontend integration. For schema details and further examples, refer to the Swagger annotations in the route files.

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
