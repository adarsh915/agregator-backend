# File Upload Installation Guide

## Step 1: Install Required Packages

Run this command in the `backend` directory:

```bash
npm install @fastify/multipart @fastify/static
```

### Packages Installed:
- **@fastify/multipart** - Handles file uploads (multipart/form-data)
- **@fastify/static** - Serves static files (uploaded images)

## Step 2: Directory Structure Created

```
backend/
├── uploads/
│   └── logos/
│       └── .gitkeep        ← Directory placeholder
├── src/
│   ├── routes/
│   │   └── uploads.js      ← NEW: Upload routes
│   └── app.js              ← UPDATED: Added file upload support
└── .gitignore              ← UPDATED: Ignore uploaded files
```

## Step 3: What Was Implemented

### 1. Upload Route (`POST /api/v1/uploads/logo`)
- Accepts image files (JPEG, PNG, GIF, SVG, WebP)
- Validates file type and size (max 5MB)
- Generates unique filename using crypto
- Saves to `backend/uploads/logos/`
- Returns file path for database storage

### 2. Delete Route (`DELETE /api/v1/uploads/logo/:filename`)
- Deletes uploaded logo file
- Security: prevents path traversal attacks
- Returns success/error response

### 3. Static File Serving
- Serves uploaded files at: `http://127.0.0.1:8081/uploads/logos/filename.jpg`
- Configured in `app.js` with `@fastify/static`

### 4. Security Features
- Authentication required (JWT token)
- File type validation
- File size validation (5MB max)
- Unique filenames (prevents overwriting)
- Path traversal prevention

## Step 4: Restart Backend Server

After installing packages, restart your backend:

```bash
cd backend
npm install @fastify/multipart @fastify/static
npm start
```

## Step 5: Test Upload Endpoint

### Using Postman:

1. **POST** `http://127.0.0.1:8081/api/v1/uploads/logo`
2. **Headers:**
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```
3. **Body:** 
   - Type: `form-data`
   - Key: `file`
   - Type: `File`
   - Value: Select an image file

### Expected Response:
```json
{
  "ok": true,
  "message": "Logo uploaded successfully",
  "filePath": "/uploads/logos/a1b2c3d4e5f6...abc123.jpg",
  "filename": "a1b2c3d4e5f6...abc123.jpg",
  "originalName": "company-logo.jpg",
  "size": 125344,
  "mimetype": "image/jpeg"
}
```

### Access Uploaded File:
```
http://127.0.0.1:8081/uploads/logos/a1b2c3d4e5f6...abc123.jpg
```

## Step 6: Frontend Integration

The frontend already sends file uploads! Now update the API call to actually upload files:

### Current Flow (Placeholder):
```typescript
// Frontend generates placeholder path
setEntLogoStoragePath(`/uploads/logos/${file.name}`);
```

### New Flow (Actual Upload):
```typescript
// 1. Upload file first
const formData = new FormData();
formData.append('file', entLogoFile);

const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/uploads/logo`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { filePath } = await uploadResponse.json();

// 2. Then create/update enterprise with returned path
await enterpriseApi.create({
  logoStoragePath: filePath, // Use actual path from upload
  // ... other fields
});
```

## File Upload Flow

```
Frontend selects file
    ↓
Validate file (type, size)
    ↓
Show preview (base64)
    ↓
User clicks Save
    ↓
Upload file to POST /api/v1/uploads/logo
    ↓
Backend validates & saves file
    ↓
Backend returns file path: /uploads/logos/abc123.jpg
    ↓
Frontend sends path in enterprise create/update
    ↓
Database stores: /uploads/logos/abc123.jpg
    ↓
Display: http://127.0.0.1:8081/uploads/logos/abc123.jpg
```

## Storage Location

### Physical Path:
```
E:\allproject\kael-project\kael-aggregator-dashboard\backend\uploads\logos\
```

### Access URL:
```
http://127.0.0.1:8081/uploads/logos/{filename}
```

### Database Storage:
```sql
-- enterprises table
logo_storage_path: '/uploads/logos/{filename}'
```

## Security Notes

1. **Authentication Required:** All upload/delete operations require valid JWT token
2. **File Type Validation:** Only image files allowed
3. **File Size Limit:** Maximum 5MB per file
4. **Unique Filenames:** Crypto-generated to prevent conflicts
5. **Path Traversal Prevention:** Validates filename in delete route
6. **CORS Enabled:** Frontend can upload from localhost:3000

## Troubleshooting

### Error: "Cannot find module '@fastify/multipart'"
**Solution:** Run `npm install @fastify/multipart @fastify/static`

### Error: "ENOENT: no such file or directory"
**Solution:** Directory is created automatically on first upload

### Error: 413 Payload Too Large
**Solution:** File exceeds 5MB limit. Choose smaller file or increase limit in `app.js`

### Error: 401 Unauthorized
**Solution:** Add `Authorization: Bearer {token}` header

### Images not accessible at URL
**Solution:** 
1. Check backend console for static route registration
2. Verify file exists in `backend/uploads/logos/`
3. Test URL directly in browser

## Next Steps

1. ✅ Install packages: `npm install @fastify/multipart @fastify/static`
2. ✅ Restart backend server
3. ✅ Test upload endpoint with Postman
4. 🔲 Update frontend to call upload endpoint before create/update
5. 🔲 Test end-to-end: Upload → Save → Display

## Complete! 🎉

Your backend now supports file uploads and serves static files!
