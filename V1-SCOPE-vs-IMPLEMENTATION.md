# EMS V1 Scope (PDF) vs Backend Implementation

This document maps the **EMS Core Platform — v1 Scope & Non-goals** PDF to what is **done** vs **pending** in the backend.

---

## v1 Outcomes (from PDF) — Backend relevance

| Outcome | Backend status |
|--------|-----------------|
| **Real adoption** (one school onboard, go-live, daily ops) | **Partial**: Tenant + institution + academics + students + fees + attendance exist; missing timetable, exams, announcements, teacher/parent roles, go-live/demo handling. |
| **Operational reliability** (attendance, announcements, marks, fees work daily) | **Partial**: Attendance + fees work; announcements + marks (exams) not implemented. |
| **Trust** (audit trail, consistent data) | **Done**: Audit interceptor for CREATE/UPDATE/DELETE; tenant isolation. |
| **Role clarity** (Admin / Teacher / Parent; wrong-role blocked) | **Partial**: Admin (SchoolAdmin/SUPER_ADMIN) enforced; **Teacher** and **Parent** roles/APIs not implemented. |
| **Go-Live** (demo → go-live; onboarding checklist; no demo data as truth) | **Not done**: No demo/go-live flag or checklist APIs. |
| **Configurability** (attendance, marks visibility, announcements audience, fee rules per school) | **Partial**: Fee rules (structures) exist; no policy/configuration APIs for attendance, marks visibility, or announcements. |
| **Supportable** (non-technical staff, predictable workflows) | Product/UX; backend supports via stable APIs where implemented. |

---

## Must-have capabilities (PDF A–J) — Done vs Pending

### A) Core platform foundations

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Secure login and session handling | ✅ | Login + JWT; no refresh token. |
| Role-based access control (Admin / Teacher / Parent) | ⚠️ Partial | Admin (SchoolAdmin, SUPER_ADMIN) only; **Teacher** and **Parent** roles/guards not implemented. |
| Strict separation of data per institution | ✅ | TenantId on all tenant-scoped entities; middleware enforces tenant context. |
| Audit logging for critical actions (create/update/delete/approve/post) | ✅ | Global audit interceptor for CREATE/UPDATE/DELETE; key records covered. “Approve/post” not explicitly modeled. |
| Basic notification capability (in-app) for key events | ❌ | No notifications module; no announcements/marks-posted/fees-generated/leave-approval events. |
| Go-Live state (demo mode removable after go-live) | ❌ | No demo/go-live flag or APIs. |

---

### B) Academic structure (foundation)

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Grades exist by default (K–12); schools choose which they operate | ❌ | No “grades” entity; **classes** exist per academic year, not K–12 grade master. |
| Admin can create sections for grades, define capacity, class number/name | ⚠️ Partial | Sections exist (classId, name); **no capacity**; “grades” = classes in current model. |
| Admin can assign **subjects** to grades; core subject details (name/code) | ❌ | No **Subject** model or API. |
| Teacher assignment to sections and/or subjects | ❌ | No teacher–section or teacher–subject assignment. |
| Student records (basic identity + enrollment into section) | ✅ | Students CRUD + assign-class (class, which has sections). |
| Unique IDs (student ID / admission number); series configurable later | ⚠️ Partial | Admission number unique per tenant; **no configurable series** API. |

---

### C) Timetable and academic planning (minimum workable)

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Admin defines school operating hours and periods | ❌ | **TimetableModule** empty; no operating hours/periods. |
| Timetable per section and per teacher | ❌ | Not implemented. |
| “No class” slots shown explicitly | ❌ | Not implemented. |
| Timetable accurate for daily ops (attendance + classroom schedule) | ❌ | Not implemented. |
| When teachers on leave, admin assigns proxy/substitute (at least for that day) | ❌ | Not implemented. |

**Summary:** **0%** of timetable scope is implemented.

---

### D) Attendance (daily trust engine)

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Teachers mark attendance only for **assigned** sections | ⚠️ Partial | Mark by sectionId exists; **teacher–section assignment** not in BE, so “assigned” not enforced. |
| Status types: **Present / Absent / Leave / Late** | ⚠️ Partial | Schema has **PRESENT, ABSENT** only; **Leave** and **Late** missing. |
| Submitted once per day per section; “submitted vs pending” state | ⚠️ Partial | One record per section/date; **no explicit “submitted” vs “pending”** state. |
| Attendance resets daily (school timezone); monthly % calculated | ❌ | No timezone/reset logic; no monthly % aggregation. |
| Parent visibility (daily record, policy-controlled) | ❌ | No parent role or policy APIs. |
| Admin view summaries and investigate missing submissions | ⚠️ Partial | List attendance by filters; **no summary aggregates** or “missing submissions” API. |

---

### E) Teacher leave & admin approvals

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Teacher can apply for leave (reason, dates) | ❌ | No leave application model or API. |
| Admin approve/reject with reason | ❌ | Not implemented. |
| Admin assign substitute/proxy coverage | ❌ | Not implemented. |
| Temporary access for attendance if class teacher absent (admin-authorized, time-bounded) | ❌ | Not implemented. |

**Summary:** **0%** of teacher leave & approvals implemented.

---

### F) Exams, marks, and posting (academic trust engine)

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Admin can define exams and schedule them | ❌ | **ExamsModule** empty; no exam/schedule model or API. |
| Teachers enter marks for assigned sections/subjects | ❌ | No marks entry; no subjects. |
| Save-in-progress and later editing (as allowed) | ❌ | Not implemented. |
| Posting/publishing is explicit (visibility controlled) | ❌ | Not implemented. |
| Parent visibility policy-controlled | ❌ | Not implemented. |
| When marks posted, announcement/notification prompt | ❌ | Not implemented. |

**Summary:** **0%** of exams/marks scope implemented.

---

### G) Announcements and calendar (controlled communication)

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Audience targeting (all school / grade / section / staff) | ❌ | **AnnouncementsModule** empty; no model or API. |
| Events and holidays (date-picker; no free typing) | ❌ | No events/holidays model or API. |
| Calendar: school events + exams + holidays | ❌ | Not implemented. |
| Visible in role-appropriate dashboards/calendar | ❌ | Not implemented. |
| No uncontrolled chat (default) | N/A | Backend doesn’t add chat. |

**Summary:** **0%** of announcements/calendar implemented.

---

### H) Fees (minimum viable, operationally useful)

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Admin define fee rules: tuition + optional other costs | ✅ | Fee heads + structures; multiple heads (tuition, etc.). |
| Transport fees by **transport routes**; route cost configurable | ❌ | No transport/route model or API. |
| Invoices for selected grades/sections with per-student costs | ⚠️ Partial | Fee structures per class + assign student; **no explicit “invoice” generation or document**. |
| Fee status trackable (unpaid/paid/partial) | ✅ | Payments recorded; partial pay supported (pay amount &lt; total); get student fees shows structure. |
| Payment gateway optional; visibility + invoice recordkeeping | ⚠️ Partial | Visibility via get student fees; **no invoice/receipt API**. |
| Receipts in basic form (offline/cash) with audit trail | ❌ | No receipt entity or API; payments have audit via FeePayment. |

---

### I) Reporting and basic insights (minimum)

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Attendance summaries (daily/monthly, per section) | ❌ | No report endpoints; only raw list attendance. |
| Marks summaries (per assessment/exam) | ❌ | No exams/marks. |
| Fees summaries (pending vs paid; per class/section) | ❌ | No report endpoints; data exists for building them. |
| Reports accurate and data-backed | ❌ | No reports module. |

**Summary:** **0%** of reporting/insights implemented.

---

### J) Configuration & policies (v1 minimum set)

| Requirement | Done? | Notes |
|-------------|-------|--------|
| Attendance rule controls (late definition, leave handling, visibility) | ❌ | No policy/configuration APIs. |
| Marks visibility rules (when/what parents see) | ❌ | Not implemented. |
| Announcement/event audience targeting rules | ❌ | Not implemented. |
| Fee rules (what costs apply to whom) | ⚠️ Partial | Fee structures define “whom” (class) and costs; no extra policy API. |
| Notification preferences baseline (in-app default) | ❌ | No notifications module. |

---

## Technical dependencies (from PDF) — Backend status

| Dependency | Done? | Notes |
|------------|-------|--------|
| Stable DB model for institution → grades → sections → subjects → users → assignments/records | ⚠️ Partial | Institution, classes, sections, students, users, profiles; **no grades master, no subjects, no teacher assignments**. |
| Tenant isolation guardrails (no cross-school queries) | ✅ | TenantId everywhere; middleware. |
| Role and permission model (RBAC) enforced consistently | ⚠️ Partial | Roles/permissions in DB + seed; **only platform/tenants use PermissionsGuard**; school routes use SchoolAdminGuard (role key). |
| Audit log framework for critical actions | ✅ | Done. |
| Notification/event framework (in-app baseline) | ❌ | Not implemented. |
| Background jobs / batch (imports/exports; v1 can start minimal) | ❌ | Not implemented; no job queue. |

---

## Execution dependencies (from PDF) — Backend readiness

| Sequence | Backend status |
|----------|----------------|
| Academic structure stable before timetable, attendance, marks, fees | ⚠️ | Academics + students + attendance + fees exist; **missing subjects, grades K–12, teacher assignment**. |
| Timetable + teacher assignment before “teacher daily workflows” | ❌ | Timetable and teacher assignment not built. |
| Posting logic before parent visibility | ❌ | No posting or parent visibility. |
| Go-live and demo handling before real pilots | ❌ | Not built. |

---

## Non-goals (from PDF) — Confirmed out of scope

These are explicitly **not** in v1 scope; no need to implement for the doc:

- Full ERP (payroll, procurement, inventory, HR, accounting)
- Deep LMS (SCORM, course authoring, learning paths)
- AI that auto-edits institutional truth
- Fully automated timetable optimization (manual-first only in v1)
- School-by-school custom code (config-driven only)
- Complex multi-channel (WhatsApp/SMS/email) by default
- Student-first portal as major focus
- Advanced analytics/BI (basic reporting only)
- Government school rollouts (private first)

---

## Summary: How much of the PDF scope is done?

| Category | Rough % done | What’s done | What’s pending |
|----------|--------------|-------------|----------------|
| **A) Core platform foundations** | ~60% | Login, tenant isolation, audit, RBAC (admin only) | Notifications, Teacher/Parent roles, go-live/demo |
| **B) Academic structure** | ~50% | Institution, academic years, classes, sections, students | Grades K–12, subjects, teacher assignment, section capacity |
| **C) Timetable** | 0% | — | All (operating hours, timetable per section/teacher, substitutes) |
| **D) Attendance** | ~45% | Mark by section, list; PRESENT/ABSENT | Leave/Late, submitted vs pending, daily reset, monthly %, parent visibility, admin summaries |
| **E) Teacher leave & approvals** | 0% | — | All |
| **F) Exams & marks** | 0% | — | All (exams, marks entry, posting, parent visibility, notification) |
| **G) Announcements & calendar** | 0% | — | All (audience, events, holidays, calendar) |
| **H) Fees** | ~55% | Heads, structures, assign, pay, partial pay, get student fees | Transport/route fees, invoices, receipts |
| **I) Reporting** | 0% | — | Attendance/marks/fees summaries, data-backed reports |
| **J) Configuration & policies** | ~10% | Fee structures (what applies to whom) | Attendance/marks/announcement rules, notification prefs |

**Overall (must-haves A–J):** roughly **25–30%** of the PDF’s must-have capabilities are implemented in the backend. The strongest areas are **core platform (tenant, audit, auth)**, **academic structure (institution, classes, sections, students)**, **fees (without transport/invoices/receipts)**, and **attendance (basic mark/list)**. **Timetable, exams/marks, announcements/calendar, teacher leave, reporting, and configuration/policies** are largely or fully pending.

---

## Recommended next steps (aligned with PDF)

1. **RBAC**: Add **Teacher** and **Parent** roles and enforce them (guards / permissions) so “role clarity” and “wrong-role blocked” are met.
2. **Academic structure**: Add **Subject** model and APIs; optionally **grades** (K–12) or document “class = grade” for v1; add **section capacity**; implement **teacher assignment** to sections/subjects.
3. **Attendance**: Add **Leave** and **Late** to `AttendanceStatus`; add **submitted vs pending**; add **monthly %** and admin **summary** endpoints; later: school timezone and daily reset.
4. **Timetable**: Implement **operating hours/periods**, **timetable per section and per teacher**, and **substitute assignment** (at least for the day).
5. **Exams & marks**: Implement **exams** (define + schedule), **marks entry** (with save-in-progress and posting), and **parent visibility** (policy-controlled).
6. **Announcements & calendar**: Implement **announcements** (audience targeting), **events/holidays**, and **calendar** API.
7. **Teacher leave**: Implement **leave application**, **approve/reject**, and **substitute** + **temporary attendance access**.
8. **Fees**: Add **invoice generation** and **receipt** (basic); optionally **transport routes** if in v1 scope.
9. **Reporting**: Add **attendance**, **marks**, and **fees** summary endpoints (data-backed).
10. **Config & policies**: Add **attendance rules**, **marks visibility**, **announcement audience** (and optionally **notification preferences**); **go-live/demo** flag and checklist if required for pilots.
