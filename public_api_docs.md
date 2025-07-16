# Flashbillr Public Customer API Documentation

## Overview

The Flashbillr Public API enables customers to register, authenticate, manage their profile, view order history, and handle password and email verification flows. All endpoints are RESTful and return JSON.

**Base Path:** `/api/public/store/:storeId/customers` (all customer/user management endpoints)
   `/api/public/store/:storeId/orders` (all order endpoints)
   `/api/public/store/:storeId/products` (all product endpoints)
   `/api/public/store/:storeId/categories` (all category endpoints)

> **Note:** All public endpoints are now store-specific. You must provide a valid `storeId` in the URL for all customer, order, product, and category operations.

---

## Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
- [Authentication & JWT](#authentication--jwt)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Products](#products)
    - [List Products](#list-products)
    - [List Categories](#list-categories)
  - [Orders](#orders)
    - [Place Order](#place-order)
    - [Track Order](#track-order)
    - [Guest Order History](#guest-order-history)
  - [Address Management](#address-management)
    - [List Addresses](#list-addresses)
    - [Add Address](#add-address)
    - [Update Address](#update-address)
    - [Delete Address](#delete-address)
    - [Get Address](#get-address)
  - [1. Register](#1-register)
  - [2. Verify Email](#2-verify-email)
  - [3. Resend Verification Email](#3-resend-verification-email)
  - [4. Login](#4-login)
  - [5. Forgot Password](#5-forgot-password)
  - [6. Reset Password](#6-reset-password)
  - [7. Get Profile](#7-get-profile)
  - [8. Update Profile](#8-update-profile)
  - [9. Order History](#9-order-history)
- [Error Handling & Response Format](#error-handling--response-format)
- [Security & Best Practices](#security--best-practices)
- [Email Flows](#email-flows)
- [FAQ & Nuances](#faq--nuances)
- [Example Flows](#example-flows)
  - [Registration & Verification](#registration--verification)
  - [Password Reset](#password-reset)
- [Contact & Support](#contact--support)

---

## Authentication & JWT

- **JWT** is used for all authenticated endpoints.
- After login, include the token in the `Authorization` header:

  ```http
  Authorization: Bearer <token>
  ```

- The token encodes `customerId`, `email`, and `storeId`.

---

## Rate Limiting

To prevent abuse and brute-force attacks, the following limits apply per IP:

| Endpoint               | Limit       | Window |
| ---------------------- | ----------- | ------ |
| `/register`            | 5 requests  | 1 hour |
| `/login`               | 10 requests | 15 min |
| `/forgot-password`     | 5 requests  | 1 hour |
| `/resend-verification` | 3 requests  | 1 hour |

Exceeding the limit returns HTTP 429 with a descriptive error.

---

## Endpoints

### Products

#### List Products

**GET** `/api/public/store/{storeId}/products`

Returns a paginated list of products for a store, with each product including its category name.

**Query Parameters:**

- `category` (optional): Filter by category ID
- `search` (optional): Search in product name, brand, or category
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Number of products per page

**Response:**

```json
{
  "products": [
    {
      "id": "prod_abc123",
      "name": "Fancy Firecracker",
      "description": "A dazzling firework.",
      "categoryId": "cat_xyz",
      "categoryName": "Fireworks",
      "brand": "SuperBrand",
      "sku": "FIRE-001",
      "mrp": 100,
      "sellingPrice": 80,
      "youtubeUrl": null,
      "inStock": true,
      "currentStock": 50
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "pages": 6
  }
}
```

#### List Categories

**GET** `/api/public/store/{storeId}/categories`

Returns all categories for a store (only those with at least one product).

**Response:**

```json
{
  "categories": [
    { "id": "cat_xyz", "name": "Fireworks" },
    { "id": "cat_abc", "name": "Sparklers" }
  ]
}
```

---

### Orders

#### Place Order

**POST** `/api/public/store/{storeId}/orders`

Place an order as a guest or authenticated customer. Accepts `multipart/form-data` (for payment screenshot) or JSON.

**Body (multipart/form-data or JSON):**

- `items` (stringified JSON array): `[ { "productId": "prod_abc", "quantity": 2 } ]`
- `paymentMethod` (string): e.g., "cash", "online"
- `guestName`, `guestEmail`, `guestPhone` (required for guests)
- `address` (stringified JSON object for guests or new address): `{ "line1": "...", ... }`
- `addressId` (string, for authenticated users with saved addresses)
- `paymentScreenshot` (file, optional)

**Success Response:**

```json
{
  "orderNumber": "ORD-1720594829000",
  "message": "Order placed successfully."
}
```

**Nuances:**

- Guests must provide name, email, phone, and address.
- Authenticated users can use saved address (`addressId`) or provide a new address.
- Returns 400 for invalid/missing data or products.

---

#### Track Order

**GET** `/api/public/store/{storeId}/orders/track`

Track an order by order number and guest info, or by user if authenticated.

**Query Parameters:**

- `orderNumber` (required)
- `email` or `phone` (required for guests)

**Success Response:**

```json
{
  "orderId": "ord_abc123",
  "orderNumber": "ORD-1720594829000",
  "status": "pending",
  "createdAt": "2025-07-09T18:00:00.000Z",
  "guestName": "John Doe",
  "items": [ { "productId": "prod_abc", "quantity": 2, ... } ],
  "address": { "line1": "...", ... }
}
```

---

#### Guest Order History

**GET** `/api/public/store/{storeId}/orders/guest-history`

Fetches order history for a guest by email or phone.

**Query Parameters:**

- `email` or `phone` (required)

**Success Response:**

```json
{
  "orders": [
    {
      "orderId": "ord_abc123",
      "orderNumber": "ORD-1720594829000",
      "status": "pending",
      "createdAt": "2025-07-09T18:00:00.000Z",
      "items": [ { "productId": "prod_abc", "quantity": 2, ... } ],
      "address": { "line1": "...", ... }
    }
  ]
}
```

---

### Address Management

These endpoints require the customer to be authenticated (bearer token in `Authorization` header).

#### List Addresses

**GET** `/api/public/store/{storeId}/customers/addresses`

Returns all saved addresses for the authenticated customer.

**Response:**

```json
{
  "addresses": [
    {
      "id": "addr_abc123",
      "name": "Home",
      "line1": "123 Main St",
      "line2": "Apt 4B",
      "city": "Chennai",
      "state": "TN",
      "zip": "600001",
      "country": "India",
      "phone": "9876543210",
      "isDefault": true,
      "createdAt": "2025-07-10T13:00:00.000Z",
      "updatedAt": "2025-07-10T13:10:00.000Z"
    }
  ]
}
```

#### Add Address

**POST** `/api/public/store/{storeId}/customers/addresses`

**Body:**

```json
{
  "name": "Home",
  "line1": "123 Main St",
  "line2": "Apt 4B",
  "city": "Chennai",
  "state": "TN",
  "zip": "600001",
  "country": "India",
  "phone": "9876543210",
  "isDefault": true
}
```

**Success Response:**

```json
{
  "address": {
    "id": "addr_abc123",
    "name": "Home",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "Chennai",
    "state": "TN",
    "zip": "600001",
    "country": "India",
    "phone": "9876543210",
    "isDefault": true,
    "createdAt": "2025-07-10T13:00:00.000Z",
    "updatedAt": "2025-07-10T13:10:00.000Z"
  }
}
```

#### Update Address

**PUT** `/api/public/store/{storeId}/customers/addresses/{addressId}`

**Body:** Same as Add Address (fields to update)

**Success Response:**

```json
{
  "address": {
    "id": "addr_abc123",
    "name": "Home",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "Chennai",
    "state": "TN",
    "zip": "600001",
    "country": "India",
    "phone": "9876543210",
    "isDefault": true,
    "createdAt": "2025-07-10T13:00:00.000Z",
    "updatedAt": "2025-07-10T13:12:00.000Z"
  }
}
```

#### Delete Address

**DELETE** `/api/public/store/{storeId}/customers/addresses/{addressId}`

**Success Response:**

```json
{
  "success": true
}
```

#### Get Address

**GET** `/api/public/store/{storeId}/customers/addresses/{addressId}`

**Success Response:**

```json
{
  "address": {
    "id": "addr_abc123",
    "name": "Home",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "Chennai",
    "state": "TN",
    "zip": "600001",
    "country": "India",
    "phone": "9876543210",
    "isDefault": true,
    "createdAt": "2025-07-10T13:00:00.000Z",
    "updatedAt": "2025-07-10T13:12:00.000Z"
  }
}
```

---

### 1. Register

**POST** `/api/public/store/{storeId}/customers/register`

Registers a new customer for the specified store and sends a verification email.

**Path Parameter:**
- `storeId` (string, required): The unique identifier for the store.

Registers a new customer and sends a verification email.

**Body:**

```json
{
  "email": "customer@example.com",
  "password": "strongpassword",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9876543210",
  "storeId": "store_cuid"
}
```

**Success Response:**

- `201 Created`

```json
{ "message": "Registration successful. Please verify your email." }
```

**Nuances:**

- Email must be unique per store.
- Password is hashed before storage.
- Verification email includes a one-click link.

---

### 2. Verify Email

**GET** `/api/public/customers/verify-email?token=...`

Verifies customer’s email address using the token sent via email.

**Query:**

- `token` (string): Required, from the verification email.

**Success Response:**

```json
{ "message": "Email verified successfully. You can now log in." }
```

**Nuances:**

- Token is JWT, expires in 1 day.
- Cannot log in until verified.

---

### 3. Resend Verification Email

**POST** `/api/public/customers/resend-verification`

Resends the verification email if not yet verified.

**Body:**

```json
{
  "email": "customer@example.com",
  "storeId": "store_cuid"
}
```

**Success Response:**

```json
{ "message": "Verification email sent." }
```

If already verified:

```json
{ "message": "Email is already verified." }
```

**Nuances:**

- Rate-limited (3/hr).
- No indication if email/storeId combo does not exist (anti-enumeration).

---

### 4. Login

**POST** `/api/public/customers/login`

Authenticates a customer and returns a JWT.

**Body:**

```json
{
  "email": "customer@example.com",
  "password": "strongpassword",
  "storeId": "store_cuid"
}
```

**Success Response:**

```json
{
  "token": "<jwt>",
  "customer": {
    "id": "...",
    "email": "...",
    "firstName": "...",
    "lastName": "...",
    "phone": "..."
  }
}
```

**Nuances:**

- Only works if email is verified.
- JWT is valid for 7 days.

---

### 5. Forgot Password

**POST** `/api/public/customers/forgot-password`

Sends a password reset email if the customer exists.

**Body:**

```json
{
  "email": "customer@example.com",
  "storeId": "store_cuid"
}
```

**Success Response (always):**

```json
{ "message": "If the email exists, a reset link has been sent." }
```

**Nuances:**

- No indication if email/storeId is valid (security).
- Reset link expires in 1 hour.

---

### 6. Reset Password

**POST** `/api/public/customers/reset-password`

Resets the password using the token from the reset email.

**Body:**

```json
{
  "token": "<reset_token_from_email>",
  "password": "newstrongpassword"
}
```

**Success Response:**

```json
{ "message": "Password reset successful. You can now log in." }
```

**Nuances:**

- Token is JWT, expires in 1 hour.
- Resets password and invalidates the token.

---

### 7. Get Profile

**GET** `/api/public/customers/profile`

Returns the authenticated customer’s profile.

**Headers:**

- `Authorization: Bearer <jwt>`

**Response:**

```json
{
  "customer": {
    "id": "...",
    "email": "...",
    "firstName": "...",
    "lastName": "...",
    "phone": "...",
    "emailVerified": true
  }
}
```

---

### 8. Update Profile

**PUT** `/api/public/customers/profile`

Updates the authenticated customer’s profile.

**Headers:**

- `Authorization: Bearer <jwt>`

**Body:**

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "9876543210"
}
```

**Response:**

```json
{
  "customer": {
    "id": "...",
    "email": "...",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "9876543210",
    "emailVerified": true
  }
}
```

---

### 9. Order History

**GET** `/api/public/customers/orders`

Returns all orders for the authenticated customer.

**Headers:**

- `Authorization: Bearer <jwt>`

**Response:**

```json
{
  "orders": [
    {
      "id": "...",
      "createdAt": "...",
      "orderItems": [ ... ],
      "address": { ... }
      // ...other order fields
    },
    // ...more orders
  ]
}
```

---

## Error Handling & Response Format

- All errors are returned as JSON:

```json
{ "error": "Descriptive message" }
```

- Common HTTP status codes:
  - `400` Bad Request (validation, missing fields)
  - `401` Unauthorized (invalid/expired JWT)
  - `403` Forbidden (email not verified)
  - `404` Not Found (resource missing)
  - `409` Conflict (duplicate registration)
  - `429` Too Many Requests (rate limiting)
  - `500` Internal Server Error

---

## Security & Best Practices

- All sensitive actions (register, login, password reset, verification) are rate-limited.
- Email and password are never exposed in logs or responses.
- JWT secrets and mail credentials must be kept secure via environment variables.
- Passwords are always hashed (bcrypt).
- No endpoint leaks whether an email/storeId exists (anti-enumeration).
- All flows are store-scoped (multi-tenant ready).

---

## Email Flows

- **Verification Email:** Sent on registration and on resend. Contains a one-click verification link.
  - Token is JWT, expires in 1 day.
  - Email is branded with the store’s logo and color.
- **Password Reset Email:** Sent on forgot-password. Contains a one-click reset link.
  - Token is JWT, expires in 1 hour.
  - Email is branded and mobile-friendly.

---

## FAQ & Nuances

- **Q:** Can a customer register for multiple stores with the same email?  
  **A:** Yes, emails are unique per store.

- **Q:** What happens if a customer tries to log in before verifying their email?  
  **A:** Login is blocked with a clear error message.

- **Q:** Can a customer request password reset for an unregistered email?  
  **A:** The response is always generic for security.

- **Q:** What if a customer’s verification or reset token expires?  
  **A:** They can request a new one via the resend or forgot-password endpoints.

- **Q:** Are all responses JSON?  
  **A:** Yes, including errors.

---

## Example Flows

### Registration & Verification

1. **POST** `/register` → Receives verification email.
2. **GET** `/verify-email?token=...` → Email verified.
3. **POST** `/login` → Receives JWT.

### Password Reset

1. **POST** `/forgot-password` → Receives reset email.
2. **POST** `/reset-password` with token and new password → Password updated.

---

## Contact & Support

For integration issues or questions, contact the backend team or open an issue in the repository.

---

**This documentation is accurate as of 2025-07-10.**  
If you add or change endpoints, update this doc accordingly!
