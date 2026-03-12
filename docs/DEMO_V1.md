# EMS Backend — V1 Production-Ready Demo

## Model audit and associations

| Model | Purpose | Associations |
|-------|---------|--------------|
| **User** | System user (email, hashed password) | Has many **Profile** (User ↔ Role via Profile) |
| **Role** | Permission set (SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, ACCOUNTANT) | Has many **Profile**; has many **RolePermission** → **Permission** |
| **Profile** | Links User to Tenant + Organization + Role | Belongs to **User**, **Role** |
| **Tenant** | School/organization (multi-tenant) | Has **Institution**, **AcademicYear**, etc. |
| **Institution** | School details (name, contact) | Belongs to **Tenant** (1:1 per tenant) |
| **AcademicYear** | Year (start/end, isActive) | Belongs to **Tenant**; has **Class**, **StudentClass**, **FeeStructure** |
| **Class** | Grade (e.g. Class 1) | Belongs to **AcademicYear**; has **Section**, **StudentClass**, **FeeStructure** |
| **Section** | Section of a class (e.g. A) | Belongs to **Class**; has **Attendance** |
| **Student** | Student record | Has **StudentClass** (↔ Class per year), **AttendanceStudent**, **StudentFee** |
| **StudentClass** | Student enrolled in Class for a year | Belongs to **Student**, **Class**, **AcademicYear** |
| **Attendance** | One record per Section per date | Belongs to **Section**; has **AttendanceStudent** |
| **AttendanceStudent** | Student present/absent for a date | Belongs to **Attendance**, **Student** |
| **FeeStructure** | Fee template per Class per year | Belongs to **AcademicYear**, **Class**; has **FeeStructureItem**, **StudentFee** |
| **StudentFee** | Student assigned to a fee structure | Belongs to **Student**, **FeeStructure**; has **FeePayment** |
| **FeePayment** | Payment against StudentFee | Belongs to **StudentFee** |

**Note:** User does not directly “belong to” Role; **Profile** links User to Tenant, Organization (tenant id), and Role. One user can have multiple profiles (e.g. different schools/roles).

---

## Authentication flow

1. **Login** — `POST /auth/login` with `{ email, password }`.
2. **Password** — Stored hashed with **bcrypt** (12 rounds) in `User.password`.
3. **JWT** — Issued on success; secret from **env** (`JWT_SECRET`); default expiry `JWT_EXPIRES_IN` (e.g. `15m`).
4. **Protected routes** — `TenantContextMiddleware` runs on all routes:
   - Reads `Authorization: Bearer <token>`.
   - Verifies JWT with `JWT_SECRET` and attaches `tenantId`, `profileId`, etc. to the request.
   - Routes that need a tenant (students, attendance, fees, etc.) use guards that require `req.tenantId` (e.g. `SchoolAdminGuard`, `AttendanceAccessGuard`).
5. **Register** — `POST /auth/register` (email, password, profiles with tenantId/orgId/roleId). Sign-up flow uses **school code** → `GET /auth/signup-options?code=XXX` → then register with returned profile ids.

---

## How to run migrations

From the backend root (`ems-backend`):

```bash
# Apply all pending migrations (creates/updates DB schema)
npx prisma migrate dev

# Or using npm script
npm run prisma:migrate
```

- Uses `DATABASE_URL` from `.env`.
- For a **fresh DB**, run once; Prisma will apply all migrations in order.
- For **production**, use: `npx prisma migrate deploy` (no interactive prompt).

---

## How to run seed

From the backend root:

```bash
# Run seed (RBAC + demo data)
npx prisma db seed

# Or using npm script
npm run prisma:seed
```

- **Requires:** Migrations applied and `DATABASE_URL` set.
- **Seeds:**
  1. **RBAC:** All permissions + roles (SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, ACCOUNTANT) with correct permissions.
  2. **Demo tenant:** Tenant “Demo School” (code `DEMO`).
  3. **Institution:** “Demo School” for that tenant.
  4. **Admin user:** See credentials below.
  5. **Academic year:** Current year, active.
  6. **Class 1**, **Section A**.
  7. **2 students:** Alice Smith (STU001), Bob Jones (STU002), assigned to Class 1.

Seed is **idempotent**: re-running will upsert roles/permissions and skip creating duplicate tenant, user, class, section, or students.

---

## Login credentials (after seed)

| Email | Password | Role / Tenant |
|-------|----------|----------------|
| **admin@ems.com** | **Admin@123** | School Admin for “Demo School” (tenant code `DEMO`) |

- Use these in the frontend login or with `POST /auth/login` for API testing.
- For **sign-up**, use school code **`DEMO`** on the sign-up page to create more users in the same tenant.

---

## Environment

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
JWT_SECRET="your-secure-secret"
JWT_EXPIRES_IN="15m"
```

- **JWT_SECRET** — Required in production; used to sign and verify JWTs.
- **bcrypt** — No env needed; used in code for hashing passwords.

---

## Quick start (full demo)

```bash
cd ems-backend
cp .env.example .env
# Edit .env: set DATABASE_URL (and JWT_SECRET for production)

npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Then open the frontend, go to **Login**, and sign in with **admin@ems.com** / **Admin@123**.
