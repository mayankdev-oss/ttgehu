# Technical Requirements Document (TRD)
## Exam & Class Slot Management System

**Version:** 1.0
**Date:** September 2026
**Companion to:** PRD v2.0

---

## 1. Architecture Overview

```
┌────────────┐      REST/JSON      ┌───────────────────┐
│   React    │ ◄─────────────────► │   Django + DRF     │
│  Frontend  │                     │   (API server)      │
└────────────┘                     └─────────┬───────────┘
                                              │
                     ┌────────────────────────┼─────────────────────┐
                     ▼                        ▼                     ▼
             ┌───────────────┐       ┌────────────────┐    ┌────────────────┐
             │  PostgreSQL   │       │  Celery Workers │    │  Redis (broker  │
             │  (primary DB) │       │  (async jobs)   │    │  + cache)       │
             └───────────────┘       └────────┬────────┘    └────────────────┘
                                               │
                                     ┌─────────┴─────────┐
                                     ▼                   ▼
                              PDF Generation        Email Sending
                              (WeasyPrint)           (SMTP/SES/SendGrid)
```

**Why this stack given the constraints:**
- Thousands of students / many classrooms → seating generation, PDF rendering, and bulk email are all **async** via Celery + Redis. The API only enqueues jobs and returns a job ID; the frontend polls/streams job status.
- Admin-only auth → simpler auth surface (Django's built-in auth + DRF Token/JWT), no public-facing auth flows needed.
- Django chosen over pure FastAPI for the admin-heavy CRUD (classrooms, courses, teachers, students) where Django admin + ORM migrations save significant build time; DRF layered on top for the API the React frontend consumes. (If preferred, this can be FastAPI instead — the data model and job architecture below are framework-agnostic.)

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend framework | Django + Django REST Framework | Admin panel reused for internal ops tooling |
| Frontend | React (Vite), TypeScript recommended | SPA consuming REST API |
| Database | PostgreSQL | Relational integrity for seating/constraint data |
| Async jobs | Celery | Seating generation, PDF batch generation, bulk email |
| Broker/cache | Redis | Celery broker + job status cache |
| File parsing | `openpyxl` / `pandas` | Excel student list ingestion |
| PDF generation | WeasyPrint (HTML→PDF) | Seating charts, duty lists |
| Email delivery | SMTP via provider (SendGrid/AWS SES) | Delivery status tracked in DB |
| Auth | Django session/DRF Token auth | Admin-only; no OAuth needed for v1 |
| Deployment | Docker Compose (dev) → containers behind reverse proxy (prod) | Separate containers: web, worker, redis, postgres |

---

## 3. Data Model (Core Entities)

- **Classroom**: id, name, capacity, layout_type_id
- **LayoutType**: id, name, rows, cols, shape (`grid`/`circular`), seat_numbering_format, adjacency_rule
- **Seat**: id, layout_type_id, position (row/col or index), adjacency list (precomputed per layout type)
- **Course**: id, code, name, semester
- **ExamSession**: id, name, date
- **Slot**: id, exam_session_id, start_time, duration_minutes
- **Student**: id, name, roll_number (unique per session), course_id, semester
- **Teacher**: id, name, email, department
- **TeacherUnavailability**: id, teacher_id, date
- **SeatingPlan**: id, exam_session_id, slot_id, status (`draft`/`preview`/`approved`), generated_at, generated_by
- **SeatAssignment**: id, seating_plan_id, classroom_id, seat_id, student_id
- **InvigilationAssignment**: id, seating_plan_id, classroom_id, teacher_id, slot_id
- **NotificationLog**: id, invigilation_assignment_id, sent_at, status (`sent`/`failed`/`pending`), error_message
- **AuditLog**: id, seating_plan_id, actor, action, field_changed, old_value, new_value, timestamp

Indexes: `SeatAssignment(seating_plan_id, classroom_id)`, `Student(course_id)`, `InvigilationAssignment(teacher_id, slot_id)` — the last one enforces the "no continuous duty" and "balanced load" checks efficiently at scale.

---

## 4. Seating Algorithm

**Problem shape:** constraint satisfaction — assign students to seats such that:
1. No two adjacent seats (per layout's adjacency map) hold students from the same course.
2. Classroom/seat capacity respected.
3. Students distributed evenly across available classrooms (avoid one classroom packed, another empty).

**Approach:**
1. **Precompute adjacency** per layout type once (not per run) — for grid layouts this is straightforward (up/down/left/right, optionally diagonal); for circular layouts, adjacency is left/right neighbor in the ring.
2. **Greedy + backtracking hybrid**:
   - Sort courses by student count descending (place hardest-to-place groups first).
   - For each classroom, fill seats round-robin across courses present in that room, checking adjacency constraint before placing; on conflict, try next available seat; maintain a small backtrack window (not full CSP backtracking — at thousands-of-students scale, full backtracking search is too slow) to avoid dead-ends.
   - If a valid placement can't be found for a student within the backtrack window, mark as **unplaced/conflict** and surface it to the admin rather than failing the whole run.
3. **Invigilator assignment** is a separate, simpler constraint pass: round-robin teachers across classroom×slot pairs, skipping unavailable teachers and enforcing a minimum gap between a teacher's consecutive duties; track cumulative duty count per teacher and prefer least-assigned first (balanced load).
4. Both passes run inside a single Celery task per generation request; progress is reported back via job status updates (e.g., "150/500 students placed").

**Complexity note:** the greedy+bounded-backtrack approach is chosen over exact CSP solving (e.g., full constraint propagation/SAT) because it scales near-linearly and is good enough for this problem — perfect optimality isn't required, only constraint satisfaction with occasional admin-resolved conflicts.

---

## 5. API Surface (representative, not exhaustive)

```
POST   /api/classrooms/                  create classroom
GET    /api/classrooms/                  list
POST   /api/layout-types/                define custom layout
POST   /api/exam-sessions/                create session
POST   /api/exam-sessions/{id}/students/upload   Excel upload (validated, async parse job)
POST   /api/exam-sessions/{id}/generate         enqueue seating generation job → returns job_id
GET    /api/jobs/{job_id}/status                poll generation progress
GET    /api/seating-plans/{id}/preview          preview grid + conflicts
PATCH  /api/seating-plans/{id}/assignments/{assignment_id}   manual edit (logged to AuditLog)
POST   /api/seating-plans/{id}/approve          triggers notification job
GET    /api/seating-plans/{id}/export/pdf       bulk PDF (zip)
GET    /api/dashboard/summary                   counts, conflicts, duty distribution
```

---

## 6. File Upload & Validation

- Excel parsed via `pandas.read_excel` (or `openpyxl` for streaming very large files).
- Validation pass before commit: required columns present, no duplicate roll numbers within session, course codes exist in system, semester values valid.
- Validation errors returned as a row-by-row report (not just a generic failure) so the admin can fix the source file.
- For very large files (thousands of rows), parsing runs as an async job too, with a status check endpoint, rather than a synchronous upload request.

---

## 7. PDF Generation

- Seating charts rendered as HTML templates (Jinja2/Django templates) reflecting the actual grid/circular layout, then converted via WeasyPrint.
- Bulk generation (all classrooms for a session) batched as a single Celery task producing a zip, to avoid one-request-per-classroom overhead.

---

## 8. Email Notifications

- Sent only after `approve` action.
- One Celery task per teacher notification (parallelizable), each result recorded in `NotificationLog`.
- Failed sends retried with exponential backoff (Celery's built-in retry); failures surfaced on the admin dashboard with a manual "resend" action.

---

## 9. Deployment & Scaling

- Docker Compose services: `web` (Django/DRF), `worker` (Celery), `beat` (if scheduled tasks needed later), `redis`, `postgres`, `nginx` (reverse proxy + static files).
- Horizontal scaling: multiple Celery workers for generation-heavy periods (start of semester exams); web server can scale separately since it's mostly CRUD + job enqueue/poll.
- Database: connection pooling (e.g., `pgbouncer`) recommended once concurrent admin users + worker load grows.
- Monitoring: Celery task success/failure rates, job queue depth, DB query time on seating generation — these are the likely bottlenecks at "thousands of students" scale.

---

## 10. Security Notes (v1 scope)

- Admin-only auth: enforce strong password policy + rate-limited login (no public signup surface to worry about).
- Uploaded Excel files scanned for size/type before parsing to avoid resource exhaustion.
- All PDF/export endpoints require authenticated admin session (no public/unauthenticated links, since teachers/students don't log in — delivery is via direct email attachment, not a shareable link).

---

## 11. Open Items for Next Discussion

- Exact adjacency rule for circular layout (immediate left/right only, or also "across" the circle?)
- Retention policy: how long are old seating plans / uploaded student lists kept?
- Whether conflicts that can't be auto-resolved need a specific manual-resolution UI (e.g., swap-two-seats tool) — assumed yes per PRD 3.8, but interaction design not yet specified.
