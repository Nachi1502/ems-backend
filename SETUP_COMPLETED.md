# EMS Backend – Setup Summary

Summary of completed setup steps for the EMS (Education Management System) backend.

---

## 1. Project Initialization

- **Stack:** NestJS, TypeScript, Prisma, PostgreSQL
- **Config:** Environment-based via `ConfigModule` (`.env`, `.env.local`)
- **Structure:** Modular monolith with domain modules
- **No:** Caching, queues, API Gateway, infrastructure-specific code

### Project Structure

```
src/
├── config/configuration.ts      # JWT, env config
├── prisma/prisma.module.ts
├── prisma/prisma.service.ts
├── common/middleware/           # Tenant context
├── modules/
│   ├── auth/
│   ├── tenants/
│   ├── organizations/
│   ├── academics/
│   ├── timetable/
│   ├── attendance/
│   ├── exams/
│   ├── announcements/
│   ├── fees/
│   ├── audit/
│   └── rbac/
```

---

## 2. Prisma Setup

- **ORM:** Prisma with PostgreSQL
- **Schema:** `prisma/schema.prisma` (models and relations)
- **Initial migration:** `prisma/migrations/20260203110356_init/migration.sql`
- **Client:** Generated via `npx prisma generate`
- **No:** `db push` – migrations only

### Models

| Model | Purpose |
|-------|---------|
| User | Auth, email, password, soft delete |
| Role | RBAC roles, optional tenantId |
| Permission | RBAC permission codes |
| RolePermission | Role–Permission mapping |
| Profile | User profile (tenant, org, role) |
| AuditLog | Audit trail (entity, action, old/new values) |

---

## 3. Authentication

- **Registration:** Email, password (bcrypt), optional firstName/lastName
- **Login:** Email + password, optional `profileContext` (profileId, tenantId, orgId, roleId)
- **JWT:** Access token with `sub`, `email`, `tenantId`, `organizationId`, `profileId`, `roleId`
- **Validation:** `class-validator`, global `ValidationPipe` (whitelist, forbidNonWhitelisted)
- **No:** Role or tenant logic in auth module

---

## 4. User Profiles

- **Multiple profiles:** One user can have several profiles (e.g. ADMIN, TEACHER, PARENT)
- **Context:** Each profile belongs to tenant + organization
- **Active profile:** Chosen via login `profileContext`; determines JWT claims
- **Registration:** At least one profile required (`tenantId`, `organizationId`, `roleId`)

---

## 5. Tenant Context Middleware

- **Global middleware:** `TenantContextMiddleware` on all routes
- **Extracts:** `tenantId`, `profileId`, `organizationId`, `roleId` from JWT payload
- **Request:** Attaches values to `req`
- **Scoped routes:** Rejects if tenant context is required and missing (`x-tenant-scoped: true`)

---

## 6. RBAC (Role-Based Access Control)

- **Tables:** Role, Permission, RolePermission
- **Profiles:** Linked to roles via `Profile.roleId`
- **Guard:** `PermissionsGuard` checks required permissions against DB
- **Decorator:** `@RequirePermissions('CODE1', 'CODE2')` on routes
- **No:** Hardcoded permissions; all from DB

### Seed Permissions

- USER_CREATE, USER_READ, USER_UPDATE, USER_DELETE
- ROLE_MANAGE, PERMISSION_MANAGE, TENANT_MANAGE

### Seed Role

- SUPER_ADMIN (platform-level, all permissions)

---

## 7. Audit Logging

- **Table:** AuditLog (tenantId, userId, entityName, entityId, action, oldValues, newValues, metadata)
- **Interceptor:** `AuditLoggingInterceptor` (global, via `APP_INTERCEPTOR`)
- **Scope:** POST=CREATE, PUT/PATCH=UPDATE, DELETE=DELETE
- **Entity resolution:** From path or `x-entity-name` / `x-entity-id`
- **Sensitive data:** Password-like fields removed before logging
- **No:** Changes to business logic

---

## 8. Fixes Applied

| Issue | Fix |
|-------|-----|
| `verifyAsync<unknown>` constraint | Dropped explicit generic |
| Audit Prisma delegate cast | `as unknown as PrismaDelegate` |
| JWT expiresIn type | Default `'15m'` + type assertion |
| Auth firstName/lastName | `?? null` for Prisma `string \| null` |
| DATABASE_URL missing | `.env` with `DATABASE_URL` |

---

## 9. Database Migration

- **Command:** `npx prisma migrate dev --name init`
- **Result:** Migration applied, schema in sync
- **Tables:** User, Role, Permission, RolePermission, Profile, AuditLog, `_prisma_migrations`

---

## 10. Seed Script

- **File:** `prisma/seed.ts`
- **Run:** `npx prisma db seed`
- **Idempotent:** Uses upsert (Permission) and findFirst + create/update (Role)
- **Seeds:** 7 permissions, SUPER_ADMIN role, all permissions attached to SUPER_ADMIN
- **No:** null for optional fields where possible; omits `tenantId` for platform data

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Start NestJS app |
| `npm run start:dev` | Start with watch mode |
| `npx prisma generate` | Regenerate Prisma client |
| `npx prisma migrate dev` | Create and apply migrations |
| `npx prisma migrate deploy` | Apply migrations (prod) |
| `npx prisma migrate status` | Check migration status |
| `npx prisma db seed` | Run seed script |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | JWT signing secret |
| JWT_EXPIRES_IN | Token expiry (default `15m`) |

---

## Status

- Backend compiles and starts
- Migration applied
- Seed runs successfully
- No schema or migration changes pending beyond this setup
