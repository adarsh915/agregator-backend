# 🚀 KAEL AGGREGATOR BACKEND

Enterprise CRUD system for managing SaaS multi-tenant architecture.

---

## 📦 Features

- ✅ Aggregator admin authentication (JWT)
- ✅ Complete Enterprise CRUD operations
- ✅ Separate database architecture
- ✅ RESTful API design
- ✅ Row Level Security (RLS)
- ✅ Bcrypt password hashing
- ✅ CORS enabled
- ✅ Security headers (Helmet)

---

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── env.js                 # Environment configuration
│   ├── store/
│   │   └── aggregator-store.js    # Database access layer
│   ├── services/
│   │   ├── auth-service.js        # Authentication logic
│   │   └── enterprise-service.js  # Enterprise business logic
│   ├── routes/
│   │   ├── health.js              # Health check endpoints
│   │   ├── auth.js                # Auth endpoints
│   │   └── enterprises.js         # Enterprise CRUD endpoints
│   ├── app.js                     # Fastify app setup
│   └── server.js                  # Server entry point
├── supabase/
│   ├── schema.sql                 # Database schema
│   └── seed-admin.js              # Create default admin user
├── package.json
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account
- PostgreSQL knowledge (basic)

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name: `kael-aggregator`
4. Region: Choose closest to you
5. Database Password: Save it securely
6. Click "Create new project"

### 3. Run Database Schema

1. Open Supabase SQL Editor
2. Copy contents of `supabase/schema.sql`
3. Paste and run in SQL Editor
4. Verify tables created:
   - `aggregator_users`
   - `aggregator_sessions`
   - `enterprises`

### 4. Install Dependencies

```bash
cd kael-aggregator-dashboard/backend
npm install
```

### 5. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env file with your values
```

**.env file:**
```env
# Server
PORT=8081
NODE_ENV=development

# Supabase (Get from Project Settings > API)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN_SECONDS=86400

# Backend URL
BACKEND_BASE_URL=http://127.0.0.1:8081
```

**How to get Supabase credentials:**
1. Go to Supabase Dashboard
2. Click on your project
3. Go to Settings > API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - service_role secret → `SUPABASE_SECRET_KEY` (NOT anon public!)

### 6. Create Admin User

```bash
npm run seed
```

**Default credentials:**
- Email: `admin@kael.com`
- Password: `Admin@123`

⚠️ **IMPORTANT:** Change password after first login!

### 7. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will start at: `http://127.0.0.1:8081`

### 8. Test API

**Test health endpoint:**
```bash
curl http://127.0.0.1:8081/health
```

**Test login:**
```bash
curl -X POST http://127.0.0.1:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kael.com",
    "password": "Admin@123"
  }'
```

You should get a JWT token in response!

---

## 📋 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/status` - Get auth status
- `GET /api/v1/auth/profile` - Get profile

### Enterprises
- `GET /api/v1/enterprises` - List all
- `POST /api/v1/enterprises` - Create
- `GET /api/v1/enterprises/:id` - Get single
- `PUT /api/v1/enterprises/:id` - Update
- `DELETE /api/v1/enterprises/:id` - Delete

📖 **Full API Documentation:** See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🗄️ Database Schema

### aggregator_users
```sql
id                TEXT PRIMARY KEY
email             TEXT UNIQUE NOT NULL
display_name      TEXT NOT NULL
role              TEXT NOT NULL
password_hash     TEXT NOT NULL
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### aggregator_sessions
```sql
token             TEXT PRIMARY KEY
user_id           TEXT REFERENCES aggregator_users(id)
email             TEXT NOT NULL
issued_at         TIMESTAMPTZ NOT NULL
expires_at        TIMESTAMPTZ NOT NULL
created_at        TIMESTAMPTZ
```

### enterprises
```sql
id                      TEXT PRIMARY KEY
name                    TEXT NOT NULL
logo_url                TEXT
address                 TEXT
city                    TEXT
state                   TEXT
country                 TEXT
postal_code             TEXT
gst                     TEXT
pan                     TEXT
contact_person_name     TEXT
contact_person_email    TEXT
contact_person_phone    TEXT
billing_package         TEXT
billing_status          TEXT
is_active               BOOLEAN DEFAULT true
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

---

## 🔒 Security

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens for authentication
- ✅ Row Level Security (RLS) enabled
- ✅ Service role key bypasses RLS
- ✅ CORS configured for frontend
- ✅ Helmet security headers
- ✅ SQL injection protected (parameterized queries)

---

## 🛠️ Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Migration
```bash
# If you update schema.sql, re-run it in Supabase SQL Editor
```

---

## 🐛 Troubleshooting

### Issue: "SUPABASE_URL is required"
**Solution:** Check your `.env` file has correct Supabase credentials.

### Issue: "Invalid credentials" when logging in
**Solution:** Make sure you ran `npm run seed` to create admin user.

### Issue: "Connection refused"
**Solution:** Check if server is running on port 8081.

### Issue: "Table does not exist"
**Solution:** Run `supabase/schema.sql` in Supabase SQL Editor.

---

## 📚 Related Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Database Schema](./supabase/schema.sql) - SQL schema file
- [Frontend Integration Guide](../frontend/README.md) - How to connect frontend

---

## 🤝 Support

For issues or questions:
- Email: support@kael.com
- GitHub: [Create an issue](https://github.com/your-repo/issues)

---

## 📝 License

Proprietary - All rights reserved

---

**Built with ❤️ using Fastify and Supabase**
