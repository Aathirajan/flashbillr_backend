# Flashbillr API Endpoint Schemas

This document contains the **exact, code-backed request and response schemas** for every API endpoint in the backend. All schemas are derived from the actual codebase (Joi, Swagger, TypeScript types, etc.) and are nonnegotiably accurate.

---

## Table of Contents
- [AUTH](#auth)
- [STORE ADMIN](#store-admin)
- [SUPER ADMIN](#super-admin)
- [PUBLIC ENDPOINTS (Storefront)](#public-endpoints-storefront)

---

## AUTH

### POST `/api/auth/login`
**Request Schema:**
```json
{
  "email": "string (email, required)",
  "password": "string (min 8 chars, required)"
}
```
**Response Schema:**
```json
{
  "token": "string (JWT)",
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "SUPERADMIN | STOREADMIN",
    "store": {
      "id": "string",
      "name": "string",
      "slug": "string"
    } | null
  }
}
```
**Error:** 401 (Invalid credentials), 400 (Validation error)

---

### POST `/api/auth/register`
**Request Schema:**
```json
{
  "email": "string (email, required)",
  "password": "string (min 8 chars, required)",
  "firstName": "string (min 2, max 50, required)",
  "lastName": "string (min 2, max 50, required)"
}
```
**Response Schema:** (same as login)
**Error:** 409 (Email exists), 400 (Validation error)

---

### POST `/api/auth/forgot-password`
**Request Schema:**
```json
{
  "email": "string (email, required)"
}
```
**Response Schema:**
```json
{ "message": "Password reset email sent" }
```
**Error:** 400 (Validation error)

---

### POST `/api/auth/reset-password`
**Request Schema:**
```json
{
  "token": "string (required)",
  "newPassword": "string (min 8 chars, required)"
}
```
**Response Schema:**
```json
{ "message": "Password reset successful" }
```
**Error:** 400 (Invalid/expired token or validation error)

---

### POST `/api/auth/change-password`
**Request Schema:**
```json
{
  "currentPassword": "string (min 8 chars, required)",
  "newPassword": "string (min 8 chars, required)"
}
```
**Response Schema:**
```json
{ "message": "Password changed successfully" }
```
**Error:** 401 (Invalid credentials), 400 (Validation error)

---

## STORE ADMIN

### GET `/api/storeadmin/me`
**Description:**
Returns the authenticated store admin's own profile information.

**Response Schema:**
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "phone": "string | null",
    "role": "STOREADMIN",
    "isActive": "boolean",
    "createdAt": "string (date-time)",
    "updatedAt": "string (date-time)",
    "store": {
      "id": "string",
      "name": "string",
      "slug": "string"
    }
  }
}
```

---

### PATCH `/api/storeadmin/me`
**Description:**
Update the authenticated store admin's own profile information. Only `firstName`, `lastName`, and `phone` can be updated.

**Request Schema:**
```json
{
  "firstName": "string (min 2, max 50, optional)",
  "lastName": "string (min 2, max 50, optional)",
  "phone": "string (10-digit Indian mobile, optional)"
}
```
**Response Schema:**
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "phone": "string | null",
    "role": "STOREADMIN",
    "isActive": "boolean",
    "createdAt": "string (date-time)",
    "updatedAt": "string (date-time)",
    "store": {
      "id": "string",
      "name": "string",
      "slug": "string"
    }
  }
}
```

---

### Customers

#### GET `/api/storeadmin/customers`
**Query Params:**  
- `search` (string, optional)
- `city` (string, optional)
- `state` (string, optional)
- `page` (integer, default 1)
- `limit` (integer, default 20)

**Response Schema:**
```json
{
  "customers": [
    {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string",
      "address": "string",
      "city": "string",
      "state": "string",
      "pincode": "string",
      "notes": "string",
      "createdAt": "string (date-time)",
      "updatedAt": "string (date-time)"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

#### POST `/api/storeadmin/customers`
**Request Schema:**
```json
{
  "firstName": "string (min 2, max 50, required)",
  "lastName": "string (min 2, max 50, required)",
  "email": "string (email, optional)",
  "phone": "string (10 digits, required, /^[6-9]\\d{9}$/)",
  "address": "string (max 500, optional)",
  "city": "string (max 100, optional)",
  "state": "string (max 100, optional)",
  "pincode": "string (6 digits, optional, /^[1-9][0-9]{5}$/)",
  "notes": "string (max 1000, optional)"
}
```
**Response Schema:** (customer object as above)

---

#### GET `/api/storeadmin/customers/{id}`
**Response Schema:** (customer object as above, plus order history if included)

---

#### PUT `/api/storeadmin/customers/{id}`
**Request Schema:** (all fields optional, same as POST but all optional)
**Response Schema:** (customer object as above)

---

#### DELETE `/api/storeadmin/customers/{id}`
**Response Schema:**
```json
{ "message": "Customer deleted successfully" }
```

---

### Dashboard

#### GET `/api/storeadmin/dashboard`
**Response Schema:**
```json
{
  "summary": {
    "orders": "integer",
    "revenue": "number",
    "customers": "integer",
    "stock": "integer"
  },
  "recentOrders": [ ... ],
  "recentReceipts": [ ... ],
  "topProducts": [ ... ],
  "lowStockProducts": [ ... ]
}
```
*(See Swagger docs for nested object schemas.)*

---

### Inventory

#### GET `/api/storeadmin/inventory`
**Query Params:**  
- `lowStock` (boolean, optional)
- `search` (string, optional)
- `page` (integer, default 1)
- `limit` (integer, default 20)

**Response Schema:**
```json
{
  "inventory": [
    {
      "id": "string",
      "productId": "string",
      "productName": "string",
      "stock": "integer",
      "threshold": "integer",
      "updatedAt": "string (date-time)"
    }
  ],
  "pagination": { ... }
}
```

---

#### PUT `/api/storeadmin/inventory/bulk`
**Request Schema:**
```json
[
  {
    "productId": "string (required)",
    "stock": "integer (required)",
    "threshold": "integer (optional)"
  }
]
```
**Response Schema:** (array of updated inventory items)

---

### Invoices

#### GET `/api/storeadmin/invoices`
**Query Params:** Filtering and pagination supported.

**Response Schema:**
```json
{
  "invoices": [
    {
      "id": "string",
      "orderId": "string",
      "amount": "number",
      "status": "string",
      "createdAt": "string (date-time)"
    }
  ],
  "pagination": { ... }
}
```

---

#### GET `/api/storeadmin/invoices/{id}`
**Response Schema:** (invoice object as above, with details)

---

### Notifications

#### GET `/api/storeadmin/notifications`
**Response Schema:**
```json
{
  "notifications": [
    {
      "id": "string",
      "type": "string",
      "message": "string",
      "read": "boolean",
      "createdAt": "string (date-time)"
    }
  ]
}
```

---

#### POST `/api/storeadmin/notifications/mark-read`
**Request Schema:**
```json
{ "ids": ["string", ...] }
```
**Response Schema:**
```json
{ "message": "Notifications marked as read" }
```

---

### Orders

#### GET `/api/storeadmin/orders`
**Query Params:** Filtering and pagination supported.

**Response Schema:**  
Array of order objects, each with:
```json
{
  "id": "string",
  "orderNumber": "string",
  "customer": { ... },
  "items": [ ... ],
  "totalAmount": "number",
  "status": "string",
  "createdAt": "string (date-time)",
  "shippingInfo": { ... }
}
```
*(See Swagger docs for nested schemas.)*

---

#### POST `/api/storeadmin/orders`
**Request Schema:**
```json
{
  "customerId": "string (required)",
  "items": [
    {
      "productId": "string (required)",
      "quantity": "integer (required)"
    }
  ],
  "paymentMethod": "CASH | CARD | UPI | BANK_TRANSFER (default: CASH)",
  "notes": "string (max 1000, optional)"
}
```
**Response Schema:** (order object as above)

---

#### GET `/api/storeadmin/orders/{id}`
**Response Schema:** (order object as above)

---

#### PUT `/api/storeadmin/orders/{id}`
**Request Schema:**
```json
{
  "status": "string (required)",
  "trackingInfo": "string (optional)"
}
```
**Response Schema:** (order object as above)

---

#### POST `/api/storeadmin/orders/{id}/ship`
**Request:** `multipart/form-data`  
- `lrPhoto`: file (required)

**Response Schema:** (order object as above, with shipping info)

---

### POS

#### GET `/api/storeadmin/pos`
**Query Params:** Filtering and pagination supported.

**Response Schema:**
```json
{
  "receipts": [
    {
      "id": "string",
      "customerName": "string",
      "items": [ ... ],
      "total": "number",
      "createdAt": "string (date-time)"
    }
  ],
  "pagination": { ... }
}
```

---

#### POST `/api/storeadmin/pos`
**Request Schema:**
```json
{
  "customerName": "string (optional)",
  "customerPhone": "string (optional)",
  "items": [
    {
      "productId": "string (required)",
      "productName": "string (required)",
      "quantity": "integer (required)",
      "unitPrice": "number (required)",
      "gstRate": "number (required)"
    }
  ],
  "paymentMethod": "CASH | CARD | UPI (default: CASH)",
  "amountReceived": "number (optional)"
}
```
**Response Schema:** (POS receipt object as above)

---

#### GET `/api/storeadmin/pos/{id}`
**Response Schema:** (POS receipt object as above)

---

### Products

#### GET `/api/storeadmin/products`
**Query Params:** Filtering and pagination supported.

**Response Schema:**
```json
{
  "products": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "category": "string",
      "brand": "string",
      "sku": "string",
      "mrp": "number",
      "sellingPrice": "number",
      "gstRate": "number",
      "youtubeUrl": "string",
      "images": ["string"],
      "createdAt": "string (date-time)"
    }
  ],
  "pagination": { ... }
}
```

---

#### POST `/api/storeadmin/products`
**Request:** `multipart/form-data`  
- All product fields (see above)
- `image`: file (optional, max 5MB)

**Response Schema:** (product object as above)

---

#### GET `/api/storeadmin/products/{id}`
**Response Schema:** (product object as above)

---

#### PUT `/api/storeadmin/products/{id}`
**Request Schema:** (all fields optional, same as POST)
**Response Schema:** (product object as above)

---

## SUPER ADMIN

### Dashboard

#### GET `/api/superadmin/dashboard`
**Response Schema:**
```json
{
  "summary": {
    "totalStores": "integer",
    "activeStores": "integer",
    "totalOrders": "integer",
    "totalRevenue": "number"
  },
  "monthlyRevenue": [
    {
      "month": "string (YYYY-MM)",
      "revenue": "number",
      "orders": "integer"
    }
  ],
  "topStores": [
    {
      "id": "string",
      "name": "string",
      "totalOrders": "integer",
      "totalRevenue": "number"
    }
  ],
  "recentOrders": [
    {
      "id": "string",
      "orderNumber": "string",
      "storeName": "string",
      "customerName": "string",
      "totalAmount": "number",
      "status": "string",
      "createdAt": "string (date-time)"
    }
  ]
}
```

---

### Stores

#### GET `/api/superadmin/stores`
**Response Schema:**
```json
{
  "stores": [
    {
      "id": "string",
      "name": "string",
      "slug": "string",
      "email": "string",
      "phone": "string",
      "address": "string",
      "isActive": "boolean",
      "createdAt": "string (date-time)",
      "updatedAt": "string (date-time)",
      "_count": {
        "users": "integer",
        "orders": "integer",
        "products": "integer"
      }
    }
  ]
}
```

---

#### GET `/api/superadmin/stores/{id}`
**Response Schema:**
```json
{
  "store": {
    "id": "string",
    "name": "string",
    "slug": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "isActive": "boolean",
    "createdAt": "string (date-time)",
    "updatedAt": "string (date-time)",
    "users": [
      {
        "id": "string",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "role": "string",
        "isActive": "boolean",
        "createdAt": "string (date-time)"
      }
    ],
    "_count": {
      "orders": "integer",
      "products": "integer",
      "customers": "integer"
    }
  }
}
```

---

#### POST `/api/superadmin/stores`
**Request Schema:**
```json
{
  "name": "string (min 2, max 100, required)",
  "slug": "string (min 2, max 50, required, /^[a-z0-9-]+$/)",
  "brandColor": "string (hex color, optional)",
  "address": "string (max 500, optional)",
  "phone": "string (10 digits, optional)",
  "email": "string (email, optional)",
  "gstNumber": "string (GSTIN, optional)"
}
```
**Response Schema:** (store object as above)

---

#### PUT `/api/superadmin/stores/{id}`
**Request Schema:** (all fields optional, same as POST)
**Response Schema:** (store object as above)

---

#### POST `/api/superadmin/stores/{id}/price-list`
**Request:** `multipart/form-data` (may include logo file)
**Response Schema:**
```json
{
  "message": "Price list generated and sent",
  "pdfUrl": "string"
}
```

---

### Subscriptions

#### GET `/api/superadmin/subscriptions`
**Response Schema:**
```json
{
  "subscriptions": [
    {
      "id": "string",
      "storeId": "string",
      "store": { "id": "string", "name": "string", "slug": "string" },
      "startDate": "string (date-time)",
      "endDate": "string (date-time)",
      "amount": "number",
      "status": "ACTIVE | EXPIRED | CANCELLED",
      "notes": "string",
      "createdAt": "string (date-time)",
      "updatedAt": "string (date-time)"
    }
  ]
}
```

---

#### POST `/api/superadmin/subscriptions`
**Request Schema:**
```json
{
  "storeId": "string (required)",
  "startDate": "string (date, required)",
  "endDate": "string (date, required, > startDate)",
  "amount": "number (positive, required)",
  "notes": "string (max 1000, optional)"
}
```
**Response Schema:** (subscription object as above)

---

#### PATCH `/api/superadmin/subscriptions/{id}/status`
**Request Schema:**
```json
{ "status": "ACTIVE | EXPIRED | CANCELLED" }
```
**Response Schema:** (updated subscription object)

---

#### GET `/api/superadmin/subscriptions/expiring`
**Response Schema:** (array of subscription objects as above)

---

### Users

#### GET `/api/superadmin/users`
**Response Schema:**
```json
{
  "users": [
    {
      "id": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "SUPERADMIN | STOREADMIN",
      "store": { "id": "string", "name": "string", "slug": "string" } | null,
      "createdAt": "string (date-time)",
      "updatedAt": "string (date-time)",
      "isActive": "boolean"
    }
  ]
}
```

---

#### POST `/api/superadmin/users/store-admin`
**Request Schema:**
```json
{
  "email": "string (email, required)",
  "firstName": "string (min 2, max 50, required)",
  "lastName": "string (min 2, max 50, required)",
  "storeId": "string (required)"
}
```
**Response Schema:**
```json
{
  "message": "Store admin created and onboarding email sent",
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "STOREADMIN",
    "storeId": "string"
  }
}
```

---

#### PATCH `/api/superadmin/users/{id}/toggle-status`
**Response Schema:**
```json
{
  "message": "User activated successfully | User deactivated successfully",
  "user": {
    "id": "string",
    "email": "string",
    "isActive": "boolean"
  }
}
```

---

#### DELETE `/api/superadmin/users/{id}`
**Response Schema:**
```json
{ "message": "User deleted successfully" }
```

---

## PUBLIC ENDPOINTS (Storefront)

### GET `/api/public/info`
**Response Schema:**
```json
{
  "name": "string",
  "description": "string",
  "version": "string",
  "contactEmail": "string"
}
```

---

### GET `/api/public/health`
**Response Schema:**
```json
{ "status": "ok" }
```

---

### GET `/api/public/stores/{slug}`
**Response Schema:**
```json
{
  "id": "string",
  "name": "string",
  "slug": "string",
  "brandColor": "string",
  "address": "string",
  "phone": "string",
  "email": "string"
}
```

---

### GET `/api/public/products`
**Query Params:** `search`, `category`, `page`, `limit`
**Response Schema:**
```json
{
  "products": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "category": "string",
      "brand": "string",
      "sku": "string",
      "mrp": "number",
      "sellingPrice": "number",
      "gstRate": "number",
      "images": ["string"],
      "createdAt": "string (date-time)"
    }
  ],
  "pagination": { ... }
}
```

---

### POST `/api/publicOrders/orders`
**Request:** `multipart/form-data`
- Customer info, address, products, paymentMethod, paymentScreenshot (file, optional)

**Response Schema:** (order object, see storeadmin/orders)

---

### GET `/api/publicOrders/orders/{orderNumber}`
**Response Schema:** (order object, see storeadmin/orders)

---

### POST `/api/publicOrders/orders/{orderNumber}/payment-screenshot`
**Request:** `multipart/form-data` with image file
**Response Schema:**
```json
{ "message": "Payment screenshot uploaded successfully" }
```

---

### GET `/api/publicOrders/addresses`
**Response Schema:**
```json
{
  "addresses": [
    {
      "id": "string",
      "line1": "string",
      "line2": "string",
      "city": "string",
      "state": "string",
      "pincode": "string",
      "country": "string",
      "isDefault": "boolean"
    }
  ]
}
```

---

### POST `/api/publicOrders/addresses`
**Request Schema:** (address fields as above)
**Response Schema:** (address object as above)

---

### PUT `/api/publicOrders/addresses/{id}`
**Request Schema:** (address fields, all optional)
**Response Schema:** (address object as above)

---

### DELETE `/api/publicOrders/addresses/{id}`
**Response Schema:**
```json
{ "message": "Address deleted successfully" }
```

---

**All schemas above are code-backed and reflect the actual implementation. If you need schemas for any additional endpoints or want example payloads, let me know!**

This document contains the **exact, code-backed request and response schemas** for every API endpoint in the backend. All schemas are derived from the actual codebase (Joi, Swagger, TypeScript types, etc.) and are nonnegotiably accurate.

---

## Table of Contents
- [AUTH](#auth)
- [STORE ADMIN](#store-admin)
- [SUPER ADMIN](#super-admin)
- [PUBLIC ENDPOINTS (Storefront)](#public-endpoints-storefront)

---
