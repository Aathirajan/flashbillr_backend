# Flashbillr Public API Documentation

_Last updated: 2025-07-10_

This document provides complete reference for all public API endpoints exposed by the Flashbillr backend. All details are based on the actual route logic, Prisma schema, and validation rules.

---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [General Info](#general-info)
  - [`GET /api/public/`](#get-apipublic)
- [Health Check](#health-check)
  - [`GET /api/public/health`](#get-apipublichealth)
- [Store Info](#store-info)
  - [`GET /api/public/store/{slug}`](#get-apipublicstoreslug)
- [Product Listing](#product-listing)
  - [`GET /api/public/store/{slug}/products`](#get-apipublicstoreslugproducts)
- [Product Categories](#product-categories)
  - [`GET /api/public/store/{slug}/categories`](#get-apipublicstoreslugcategories)
- [Product Details](#product-details)
  - [`GET /api/public/store/{slug}/products/{productId}`](#get-apipublicstoreslugproductsproductid)
- [Order Placement](#order-placement)
  - [`POST /api/public/orders`](#post-apipublicorders)
- [Order Tracking](#order-tracking)
  - [`GET /api/public/orders/track`](#get-apipublicorderstrack)
- [Guest Order History](#guest-order-history)
  - [`GET /api/public/orders/guest-history`](#get-apipublicordersguest-history)
- [Models](#models)
  - [Store](#store)
  - [Product](#product)
  - [Order](#order)
  - [Address](#address)
- [Common Error Format](#common-error-format)
- [Notes](#notes)

---

## General Info

### `GET /api/public/`

Returns project metadata, features, and environment info.

**Response**

```
{
  "name": "Flashbillr Backend",
  "description": "...",
  "features": ["User authentication and authorization", ...],
  "version": "1.0.0",
  "environment": "development",
  "repository": "https://github.com/Aathirajan/flashbillr_backend",
  "author": "Aathirajan"
}
```

---

## Health Check

### `GET /api/public/health`

Returns backend status, uptime, version, environment, database status, and current time.

**Response**

```
{
  "status": "ok",
  "uptime": 123.45,
  "version": "1.0.0",
  "environment": "development",
  "database": "connected",
  "currentTime": "2025-07-10T01:39:26.000Z"
}
```

---

## Store Info

### `GET /api/public/store/{slug}`

Returns public info for a store by slug.

**Path Params:**

- `slug` (string, required): Store slug

**Response**

```
{
  "store": {
    "id": "clxyz...",
    "name": "My Store",
    "slug": "my-store",
    "brandColor": "#3B82F6",
    "address": "123 Main St",
    "phone": "9876543210",
    "email": "store@example.com"
  }
}
```

**Errors**

- 404: `{ "error": "Store not found" }`

---

## Product Listing

### `GET /api/public/store/{slug}/products`

Returns paginated, filterable list of products for a store.

**Path Params:**

- `slug` (string, required): Store slug

**Query Params:**

- `category` (string, optional): Filter by category
- `search` (string, optional): Search by name, brand, or category
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Items per page

**Response**

```
{
  "products": [
    {
      "id": "clxyz...",
      "name": "Product Name",
      "description": "...",
      "categoryId": "cat123",
      "brand": "BrandX",
      "sku": "SKU123",
      "mrp": 100.0,
      "sellingPrice": 90.0,
      "youtubeUrl": "https://youtu.be/abc",
      "inStock": true,
      "currentStock": 50
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 123,
    "pages": 7
  }
}
```

**Errors**

- 404: `{ "error": "Store not found" }`

---

## Product Categories

### `GET /api/public/store/{slug}/categories`

Returns all product categories for a store.

**Path Params:**

- `slug` (string, required): Store slug

**Response**

```
{
  "categories": ["fireworks", "sparklers", "rockets"]
}
```

**Errors**

- 404: `{ "error": "Store not found" }`

---

## Product Details

### `GET /api/public/store/{slug}/products/{productId}`

Returns details for a specific product in a store.

**Path Params:**

- `slug` (string, required): Store slug
- `productId` (string, required): Product ID

**Response**

```
{
  "product": {
    "id": "clxyz...",
    "name": "Product Name",
    "description": "...",
    "categoryId": "cat123",
    "brand": "BrandX",
    "sku": "SKU123",
    "mrp": 100.0,
    "sellingPrice": 90.0,
    "youtubeUrl": "https://youtu.be/abc",
    "images": ["https://.../img1.jpg"],
    "inStock": true,
    "currentStock": 50
  }
}
```

**Errors**

- 404: `{ "error": "Product not found" }`

---

## Order Placement

### `POST /api/public/orders`

Place an order as a guest or authenticated user. Accepts `multipart/form-data` for file upload.

**Body Params:**

- `items` (string, required): JSON stringified array of order items, e.g. `[{"productId":"...","quantity":2}]`
- `paymentMethod` (string, required): e.g. `CASH`, `UPI`, etc.
- `guestName` (string, required if guest)
- `guestEmail` (string, required if guest, email format)
- `guestPhone` (string, required if guest, phone format)
- `address` (string, required if guest): JSON stringified address object
- `addressId` (string, required if authenticated)
- `paymentScreenshot` (file, optional): Payment screenshot image (max 5MB)

**Validation:**

- All fields required as per above rules. Items must be a valid JSON array with `{ productId, quantity }` objects. Address must be a valid address object. Phone/email formats enforced.

**Example Request (multipart/form-data):**

```
items: '[{"productId":"prod123","quantity":2}]'
paymentMethod: 'UPI'
guestName: 'John Doe'
guestEmail: 'john@example.com'
guestPhone: '9876543210'
address: '{"line1":"123 Main St","city":"Chennai","state":"TN","zip":"600001","country":"India"}'
paymentScreenshot: <file>
```

**Response**

```
{
  "order": {
    "id": "ord123",
    "orderNumber": "FB-2025-00001",
    "status": "PAID",
    ...
  }
}
```

**Errors**

- 400: `{ "error": "Invalid items format (must be JSON array)" }`
- 400: `{ "error": "Validation error message" }`

---

## Order Tracking

### `GET /api/public/orders/track`

Track an order by `orderNumber` and either email/phone (for guests) or by userId (if authenticated).

**Query Params:**

- `orderNumber` (string, required)
- `guestEmail` (string, required if guest)
- `guestPhone` (string, required if guest)

**Response**

```
{
  "order": {
    "orderNumber": "FB-2025-00001",
    "status": "SHIPPED",
    ...
  }
}
```

**Errors**

- 404: `{ "error": "Order not found" }`

---

## Guest Order History

### `GET /api/public/orders/guest-history`

Returns order history for a guest user by email/phone.

**Query Params:**

- `guestEmail` (string, required if guest)
- `guestPhone` (string, required if guest)

**Response**

```
{
  "orders": [ { ...order fields... } ]
}
```

---

## Models

### Store

- `id` (string, cuid)
- `name` (string)
- `slug` (string, unique)
- `brandColor` (string)
- `address` (string, optional)
- `phone` (string, optional)
- `email` (string)

### Product

- `id` (string, cuid)
- `name` (string)
- `description` (string, optional)
- `brand` (string, optional)
- `sku` (string)
- `mrp` (float)
- `sellingPrice` (float)
- `youtubeUrl` (string, optional)
- `images` (string[])
- `inStock` (boolean)
- `currentStock` (int)
- `categoryId` (string, optional)

### Order

- `id` (string, cuid)
- `orderNumber` (string, unique)
- `status` (enum: `AWAITING_PAYMENT`, `PAID`, `PACKED`, `SHIPPED`, `COMPLETED`, `CANCELLED`)
- `subtotal` (float)
- `totalAmount` (float)
- `paymentMethod` (string)
- `guestName` (string, optional)
- `guestEmail` (string, optional)
- `guestPhone` (string, optional)
- `addressId` (string, optional)
- `storeId` (string)
- `createdAt` (DateTime)

### Address

- `id` (string, cuid)
- `userId` (string, optional)
- `name` (string)
- `line1` (string)
- `line2` (string, optional)
- `city` (string)
- `state` (string)
- `zip` (string)
- `country` (string)
- `phone` (string, optional)
- `isDefault` (boolean)

---

## Common Error Format

All errors are returned as:

```
{ "error": "Error message here" }
```

---

## Notes

- All times are ISO8601 strings (UTC).
- All IDs are CUID strings unless otherwise noted.
- All endpoints are CORS enabled.
- Rate limiting, security, and error handling are enforced globally.

---

For further integration or clarification, contact the backend team or refer to the Swagger UI at `/api-docs` if available.
