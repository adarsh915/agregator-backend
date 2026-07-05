# 🚀 KAEL AGGREGATOR BACKEND - API DOCUMENTATION

## 📋 Table of Contents
- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Authentication](#authentication-endpoints)
  - [Enterprises CRUD](#enterprises-crud)
- [Error Handling](#error-handling)
- [Database Schema](#database-schema)

---

## Overview

The Kael Aggregator Backend provides REST APIs for managing enterprises in a SaaS multi-tenant architecture. This backend manages aggregator-level operations including enterprise CRUD and admin authentication.

---

## Base URL

```
Development: http://127.0.0.1:8081
Production:  https://api.your-domain.com
```

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

**How to get a token:**
1. Call `POST /api/v1/auth/login` with email and password
2. Extract the `token` from the response
3. Include it in subsequent requests

---

## API Endpoints

### Health Check

#### `GET /health`
Check if the server is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "kael-aggregator-backend",
  "version": "1.0.0"
}
```

---

### Authentication Endpoints

#### `POST /api/v1/auth/login`
Login as aggregator admin.

**Request Body:**
```json
{
  "email": "admin@kael.com",
  "password": "Admin@123"
}
```

**Response (200 OK):**
```json
{
  "userId": "admin_001",
  "email": "admin@kael.com",
  "displayName": "Super Admin",
  "role": "super_admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresInSeconds": 86400
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

---

#### `POST /api/v1/auth/logout`
Logout and invalidate token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "ok": true
}
```

---

#### `GET /api/v1/auth/status`
Get current authentication status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "ok": true,
  "auth": {
    "isAuthenticated": true,
    "email": "admin@kael.com",
    "userId": "admin_001",
    "displayName": "Super Admin",
    "role": "super_admin",
    "backendBaseUrl": "http://127.0.0.1:8081",
    "expiresAt": 1705318200000
  }
}
```

---

#### `GET /api/v1/auth/profile`
Get user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "ok": true,
  "profile": {
    "id": "admin_001",
    "email": "admin@kael.com",
    "displayName": "Super Admin",
    "role": "super_admin"
  }
}
```

---

### Enterprises CRUD

#### `GET /api/v1/enterprises`
Get list of all enterprises.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "ok": true,
  "enterprises": [
    {
      "id": "ent_acme_corporation",
      "name": "Acme Corporation",
      "logoUrl": "https://example.com/logo.png",
      "address": "Plot 123, Sector 45",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "postalCode": "400001",
      "gst": "27AABCU9603R1ZV",
      "pan": "AABCU9603R",
      "contactPersonName": "John Doe",
      "contactPersonEmail": "john@acme.com",
      "contactPersonPhone": "+91 98765 43210",
      "billingPackage": "professional",
      "billingStatus": "active",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

#### `GET /api/v1/enterprises/:id`
Get single enterprise by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string, required) - Enterprise ID (e.g., "ent_acme_corporation")

**Response (200 OK):**
```json
{
  "ok": true,
  "enterprise": {
    "id": "ent_acme_corporation",
    "name": "Acme Corporation",
    "logoUrl": "https://example.com/logo.png",
    "address": "Plot 123, Sector 45",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "postalCode": "400001",
    "gst": "27AABCU9603R1ZV",
    "pan": "AABCU9603R",
    "contactPersonName": "John Doe",
    "contactPersonEmail": "john@acme.com",
    "contactPersonPhone": "+91 98765 43210",
    "billingPackage": "professional",
    "billingStatus": "active",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Enterprise not found"
}
```

---

#### `POST /api/v1/enterprises`
Create new enterprise.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "logoUrl": "https://example.com/logo.png",
  "address": "Plot 123, Sector 45",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "postalCode": "400001",
  "gst": "27AABCU9603R1ZV",
  "pan": "AABCU9603R",
  "contactPersonName": "John Doe",
  "contactPersonEmail": "john@acme.com",
  "contactPersonPhone": "+91 98765 43210",
  "billingPackage": "professional",
  "billingStatus": "active"
}
```

**Required Fields:**
- `name` (string) - Enterprise name
- `contactPersonEmail` (string) - Contact person email

**Optional Fields:**
- `logoUrl` (string) - Company logo URL
- `address` (string) - Street address
- `city` (string) - City name
- `state` (string) - State/Province
- `country` (string) - Country name
- `postalCode` (string) - ZIP/Postal code
- `gst` (string) - GST number (India)
- `pan` (string) - PAN number (India)
- `contactPersonName` (string) - Contact person name
- `contactPersonPhone` (string) - Contact person phone
- `billingPackage` (string) - Package: "starter", "professional", "enterprise"
- `billingStatus` (string) - Status: "trial", "active", "suspended", "cancelled"

**Response (201 Created):**
```json
{
  "ok": true,
  "enterprise": {
    "id": "ent_acme_corporation",
    "name": "Acme Corporation",
    // ... all fields
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Enterprise name is required"
}
```

```json
{
  "error": "Enterprise with this name already exists"
}
```

---

#### `PUT /api/v1/enterprises/:id`
Update existing enterprise.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `id` (string, required) - Enterprise ID

**Request Body:** (all fields optional)
```json
{
  "name": "Acme Corporation Ltd",
  "logoUrl": "https://example.com/new-logo.png",
  "address": "Plot 456, Sector 78",
  "city": "Delhi",
  "state": "Delhi",
  "country": "India",
  "postalCode": "110001",
  "gst": "07AABCU9603R1ZV",
  "pan": "AABCU9603R",
  "contactPersonName": "Jane Smith",
  "contactPersonEmail": "jane@acme.com",
  "contactPersonPhone": "+91 98765 00000",
  "billingPackage": "enterprise",
  "billingStatus": "active",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "enterprise": {
    "id": "ent_acme_corporation",
    "name": "Acme Corporation Ltd",
    // ... updated fields
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Enterprise not found"
}
```

---

#### `DELETE /api/v1/enterprises/:id`
Delete enterprise.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` (string, required) - Enterprise ID

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Enterprise deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Enterprise not found"
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

---

## Database Schema

### Table: `aggregator_users`

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| email | TEXT | Unique email address |
| display_name | TEXT | User's display name |
| role | TEXT | User role (admin, super_admin) |
| password_hash | TEXT | Bcrypt hashed password |
| is_active | BOOLEAN | Account status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Table: `aggregator_sessions`

| Column | Type | Description |
|--------|------|-------------|
| token | TEXT | Primary key - JWT token |
| user_id | TEXT | Foreign key to aggregator_users |
| email | TEXT | User email |
| issued_at | TIMESTAMPTZ | Token issue time |
| expires_at | TIMESTAMPTZ | Token expiry time |
| created_at | TIMESTAMPTZ | Creation timestamp |

### Table: `enterprises`

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key - Auto-generated from name |
| name | TEXT | Enterprise name |
| logo_url | TEXT | Company logo URL |
| address | TEXT | Street address |
| city | TEXT | City name |
| state | TEXT | State/Province |
| country | TEXT | Country name |
| postal_code | TEXT | ZIP/Postal code |
| gst | TEXT | GST number (India) |
| pan | TEXT | PAN number (India) |
| contact_person_name | TEXT | Contact person name |
| contact_person_email | TEXT | Contact person email |
| contact_person_phone | TEXT | Contact person phone |
| billing_package | TEXT | Package: starter, professional, enterprise |
| billing_status | TEXT | Status: trial, active, suspended, cancelled |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

---

## Example Usage with cURL

### Login
```bash
curl -X POST http://127.0.0.1:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kael.com",
    "password": "Admin@123"
  }'
```

### Create Enterprise
```bash
curl -X POST http://127.0.0.1:8081/api/v1/enterprises \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "contactPersonEmail": "john@acme.com",
    "contactPersonName": "John Doe",
    "billingPackage": "professional"
  }'
```

### Get All Enterprises
```bash
curl -X GET http://127.0.0.1:8081/api/v1/enterprises \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Enterprise
```bash
curl -X PUT http://127.0.0.1:8081/api/v1/enterprises/ent_acme_corporation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingPackage": "enterprise",
    "billingStatus": "active"
  }'
```

### Delete Enterprise
```bash
curl -X DELETE http://127.0.0.1:8081/api/v1/enterprises/ent_acme_corporation \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

- All timestamps are in ISO 8601 format
- JWT tokens expire after 24 hours (86400 seconds)
- Enterprise IDs are auto-generated from the name (e.g., "Acme Corporation" → "ent_acme_corporation")
- Billing packages: "starter", "professional", "enterprise"
- Billing statuses: "trial", "active", "suspended", "cancelled"

---

**For support, contact: support@kael.com**
