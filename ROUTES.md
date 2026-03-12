# EMS Backend – API Routes Overview

**Base URL:** `http://localhost:3000` (or your `PORT` from `.env`)

**Tenant-scoped routes** require:
- `Authorization: Bearer <access_token>` (from login/register)
- `x-tenant-scoped: true` (so tenant context is enforced from JWT)

**Platform admin routes** (`POST /platform/tenants`) require a JWT with `TENANT_MANAGE` (platform admin from bootstrap).

---

## Health / Root

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health / hello |

---

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register user with profiles (tenantId, organizationId, roleId per profile) |
| POST | `/auth/login` | No | Login; returns access token and profile context |

---

## Platform (multi-tenant setup)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/platform/bootstrap-admin` | No | Create first platform admin |
| POST | `/platform/tenants` | JWT + TENANT_MANAGE | Create tenant and its admin |

---

## Institution (per-tenant, school admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/institution` | JWT + tenant | Create institution |
| GET | `/institution` | JWT + tenant | Get institution for tenant |
| PUT | `/institution` | JWT + tenant | Update institution |

---

## Academic Years

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/academic-years` | JWT + tenant | Create academic year |
| GET | `/academic-years/active` | JWT + tenant | Get active academic year |
| PUT | `/academic-years/:id/activate` | JWT + tenant | Set academic year as active |

---

## Classes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/classes` | JWT + tenant | Create class |
| GET | `/classes` | JWT + tenant | List classes (query: academicYearId, page, limit, search, sortBy, sortOrder) |

---

## Sections

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/sections` | JWT + tenant | Create section |
| GET | `/sections` | JWT + tenant | List sections (query: classId, page, limit, search, sortBy, sortOrder) |

---

## Students

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/students` | JWT + tenant | Create student |
| POST | `/students/assign-class` | JWT + tenant | Assign student to class |
| GET | `/students` | JWT + tenant | List students (query: page, limit, search, sortBy, sortOrder) |
| GET | `/students/:id` | JWT + tenant | Get student by id |
| PUT | `/students/:id` | JWT + tenant | Update student |
| DELETE | `/students/:id` | JWT + tenant | Soft delete student |

---

## Fees

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/fees/heads` | JWT + tenant | Create fee head |
| POST | `/fees/structures` | JWT + tenant | Create fee structure |
| POST | `/fees/assign-student` | JWT + tenant | Assign student to fee structure |
| POST | `/fees/pay` | JWT + tenant | Record fee payment |
| GET | `/fees/student/:studentId` | JWT + tenant | Get fees for student (query: page, limit) |

---

## Attendance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/attendance/mark` | JWT + tenant | Mark attendance for a section/date |
| GET | `/attendance` | JWT + tenant | List attendance (query: classId, sectionId, date, page, limit, sortBy, sortOrder) |

---

## Quick test order

1. **Bootstrap** (once): `POST /platform/bootstrap-admin`
2. **Create tenant**: `POST /platform/tenants` (with bootstrap admin token)
3. **Register school admin** for that tenant (with tenantId, organizationId, roleId from tenant creation)
4. **Login** as school admin → use returned token
5. **Set headers**: `Authorization: Bearer <token>`, `x-tenant-scoped: true`
6. Create **institution** → **academic year** → **classes** → **sections** → **students** → **fee heads/structures** → **attendance** / **payments** as needed.
