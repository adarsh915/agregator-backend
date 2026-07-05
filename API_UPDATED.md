# 🔄 UPDATED API DOCUMENTATION (UUID + Full Fields)

## Changes Summary

### ✅ What Changed

1. **Primary Keys**: TEXT (`ent_acme_corp`) → UUID (`550e8400-e29b-41d4-a716-446655440000`)
2. **Field Names**: Camel case with database snake_case mapping
3. **New Fields**: GSTIN, PAN, detailed address, billing details
4. **Validation**: GSTIN/PAN regex validation at API level
5. **Audit Trail**: `created_by`, `updated_by`, `deleted_by` support
6. **Soft Delete**: DELETE now soft-deletes, new RESTORE endpoint

---

## 🆕 New Enterprise Fields

### Required Fields
- `name` - Enterprise name
- `generalEmail` - Primary email (validated)
- `gstinNumber` - GST number (format: 22AAAAA0000A1Z5)
- `panNumber` - PAN number (format: AAAAA0000A)
- `contactName` - Authorized person name
- `contactEmail` - Contact email (validated)

### Optional Fields

**Basic Info:**
- `logoUrl` - Logo URL
- `logoStoragePath` - Storage path in Supabase
- `generalPhone` - General phone number
- `apiUrl` - Enterprise API URL

**HQ Address:**
- `hqStreet` - Street details
- `hqCity` - City
- `hqState` - State
- `hqPincode` - 6-digit pincode

**Billing:**
- `status` - active/inactive/suspended (default: active)
- `billingPlan` - starter/professional/enterprise (default: starter)
- `billingCycle` - monthly/quarterly/yearly (default: monthly)
- `billingAmount` - Amount in INR (default: 0)
- `nextBillingDate` - Next billing date

**Contact Person:**
- `contactDesignation` - Job title
- `contactPhone` - Phone number

---

## 📝 API Endpoints

### POST /api/v1/enterprises

Create new enterprise.

**Request:**
```json
{
  "name": "Acme Corporation",
  "generalEmail": "info@acme.com",
  "generalPhone": "+91 22 1234 5678",
  "gstinNumber": "27AABCU9603R1ZV",
  "panNumber": "AABCU9603R",
  "hqStreet": "Plot 123, Sector 45, Industrial Area",
  "hqCity": "Mumbai",
  "hqState": "Maharashtra",
  "hqPincode": "400001",
  "status": "active",
  "billingPlan": "professional",
  "billingCycle": "monthly",
  "billingAmount": 29999.00,
  "nextBillingDate": "2024-02-15",
  "contactName": "John Doe",
  "contactDesignation": "CEO",
  "contactEmail": "john@acme.com",
  "contactPhone": "+91 98765 43210",
  "logoUrl": "https://example.com/logo.png",
  "apiUrl": "https://api.acme.com"
}
```

**Response (201 Created):**
```json
{
  "ok": true,
  "enterprise": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "logoUrl": "https://example.com/logo.png",
    "logoStoragePath": null,
    "generalPhone": "+91 22 1234 5678",
    "generalEmail": "info@acme.com",
    "apiUrl": "https://api.acme.com",
    "gstinNumber": "27AABCU9603R1ZV",
    "panNumber": "AABCU9603R",
    "hqStreet": "Plot 123, Sector 45, Industrial Area",
    "hqCity": "Mumbai",
    "hqState": "Maharashtra",
    "hqPincode": "400001",
    "status": "active",
    "billingPlan": "professional",
    "billingCycle": "monthly",
    "billingAmount": 29999.00,
    "nextBillingDate": "2024-02-15",
    "contactName": "John Doe",
    "contactDesignation": "CEO",
    "contactEmail": "john@acme.com",
    "contactPhone": "+91 98765 43210",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "createdBy": "admin_uuid_here",
    "updatedBy": null,
    "isDeleted": false,
    "deletedAt": null,
    "deletedBy": null
  }
}
```

**Validation Errors:**
```json
// Missing required fields
{
  "error": "Required fields: name, generalEmail, gstinNumber, panNumber, contactName, contactEmail"
}

// Invalid GSTIN format
{
  "error": "Invalid GSTIN format. Expected: 22AAAAA0000A1Z5"
}

// Invalid PAN format
{
  "error": "Invalid PAN format. Expected: AAAAA0000A"
}

// Invalid email
{
  "error": "Invalid general email format"
}

// Invalid pincode
{
  "error": "Invalid pincode format. Expected: 6 digits"
}

// Duplicate GSTIN
{
  "error": "GSTIN number already exists"
}

// Duplicate PAN
{
  "error": "PAN number already exists"
}
```

---

### GET /api/v1/enterprises

List all enterprises (non-deleted only).

**Response (200 OK):**
```json
{
  "ok": true,
  "enterprises": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Corporation",
      "generalEmail": "info@acme.com",
      "gstinNumber": "27AABCU9603R1ZV",
      "panNumber": "AABCU9603R",
      "hqCity": "Mumbai",
      "hqState": "Maharashtra",
      "status": "active",
      "billingPlan": "professional",
      "contactName": "John Doe",
      "contactEmail": "john@acme.com",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### GET /api/v1/enterprises/:id

Get single enterprise.

**Response (200 OK):**
```json
{
  "ok": true,
  "enterprise": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    // ... all fields
  }
}
```

---

### PUT /api/v1/enterprises/:id

Update enterprise (all fields optional).

**Request:**
```json
{
  "name": "Acme Corporation Ltd",
  "billingPlan": "enterprise",
  "billingAmount": 99999.00,
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "ok": true,
  "enterprise": {
    // ... updated enterprise
  }
}
```

---

### DELETE /api/v1/enterprises/:id

**⚠️ Changed: Now performs SOFT DELETE**

Marks enterprise as deleted (`is_deleted = true`) instead of permanently deleting.

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Enterprise deleted successfully"
}
```

---

### POST /api/v1/enterprises/:id/restore

**🆕 NEW ENDPOINT**

Restore a soft-deleted enterprise.

**Response (200 OK):**
```json
{
  "ok": true,
  "message": "Enterprise restored successfully"
}
```

---

## 🔍 Validation Rules

### GSTIN Format
- **Pattern:** `22AAAAA0000A1Z5`
- **Length:** 15 characters
- **Format:** 
  - 2 digits (state code)
  - 5 uppercase letters
  - 4 digits
  - 1 uppercase letter
  - 1 alphanumeric (1-9 or A-Z)
  - Letter 'Z'
  - 1 alphanumeric

**Example:** `27AABCU9603R1ZV`

### PAN Format
- **Pattern:** `AAAAA0000A`
- **Length:** 10 characters
- **Format:**
  - 5 uppercase letters
  - 4 digits
  - 1 uppercase letter

**Example:** `AABCU9603R`

### Email Format
- Standard email validation regex
- Must contain `@` and domain

### Pincode Format
- **Pattern:** `######`
- **Length:** Exactly 6 digits
- **Example:** `400001`

### Status Values
- `active` - Enterprise is operational
- `inactive` - Enterprise is paused
- `suspended` - Enterprise is suspended

### Billing Plan Values
- `starter` - Basic plan
- `professional` - Mid-tier plan
- `enterprise` - Premium plan

### Billing Cycle Values
- `monthly` - Billed every month
- `quarterly` - Billed every 3 months
- `yearly` - Billed annually

---

## 🔄 Migration from Old API

### Field Mapping

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `id` (TEXT) | `id` (UUID) | Auto-generated |
| `name` | `name` | Same |
| `logoUrl` | `logoUrl` | Same |
| `address` | `hqStreet` | Renamed |
| `city` | `hqCity` | Renamed |
| `state` | `hqState` | Renamed |
| `postalCode` | `hqPincode` | Renamed, 6 digits required |
| `gst` | `gstinNumber` | Renamed, validation added |
| `pan` | `panNumber` | Renamed, validation added |
| `contactPersonName` | `contactName` | Renamed |
| `contactPersonEmail` | `contactEmail` | Renamed |
| `contactPersonPhone` | `contactPhone` | Renamed |
| `billingPackage` | `billingPlan` | Renamed |
| `billingStatus` | `status` | Renamed, different values |
| `isActive` | `status` | Merged into status field |
| - | `generalEmail` | NEW (required) |
| - | `generalPhone` | NEW |
| - | `billingCycle` | NEW |
| - | `billingAmount` | NEW |
| - | `nextBillingDate` | NEW |
| - | `contactDesignation` | NEW |

---

## 📊 Response Examples

### Minimal Request (Only Required Fields)
```json
{
  "name": "Test Corp",
  "generalEmail": "info@test.com",
  "gstinNumber": "27AABCU9603R1ZV",
  "panNumber": "AABCU9603R",
  "contactName": "Admin",
  "contactEmail": "admin@test.com"
}
```

### Full Request (All Fields)
```json
{
  "name": "Full Enterprise Inc",
  "logoUrl": "https://cdn.example.com/logo.png",
  "logoStoragePath": "/enterprises/full-ent/logo.png",
  "generalPhone": "+91 22 1234 5678",
  "generalEmail": "contact@fullent.com",
  "apiUrl": "https://api.fullent.com",
  "gstinNumber": "27AABCU9603R1ZV",
  "panNumber": "AABCU9603R",
  "hqStreet": "Tower A, 5th Floor, Tech Park",
  "hqCity": "Bangalore",
  "hqState": "Karnataka",
  "hqPincode": "560001",
  "status": "active",
  "billingPlan": "enterprise",
  "billingCycle": "yearly",
  "billingAmount": 999999.00,
  "nextBillingDate": "2025-01-15",
  "contactName": "Jane Smith",
  "contactDesignation": "CTO",
  "contactEmail": "jane@fullent.com",
  "contactPhone": "+91 98765 43210"
}
```

---

## 🎯 cURL Examples

### Create Enterprise
```bash
curl -X POST http://127.0.0.1:8081/api/v1/enterprises \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Corp",
    "generalEmail": "info@test.com",
    "gstinNumber": "27AABCU9603R1ZV",
    "panNumber": "AABCU9603R",
    "contactName": "Admin",
    "contactEmail": "admin@test.com",
    "billingPlan": "professional"
  }'
```

### Update Enterprise
```bash
curl -X PUT http://127.0.0.1:8081/api/v1/enterprises/UUID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billingPlan": "enterprise",
    "billingAmount": 99999,
    "status": "active"
  }'
```

### Soft Delete
```bash
curl -X DELETE http://127.0.0.1:8081/api/v1/enterprises/UUID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Restore
```bash
curl -X POST http://127.0.0.1:8081/api/v1/enterprises/UUID_HERE/restore \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**✅ Backend updated to match your improved schema!**
