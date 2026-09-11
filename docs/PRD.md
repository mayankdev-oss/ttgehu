# Product Requirement Document (PRD)
## Exam & Class Slot Management System

**Version:** 2.0 (Final)
**Date:** September 2026

---

## 1. Product Overview

**Product Name:** Exam & Class Slot Management System

A web-based system for college examination departments to automate:
- Exam seating arrangement generation
- Classroom allocation
- Teacher invigilation duty scheduling
- Exam slot/timetable management
- Printable seating charts and duty lists
- Automated email notifications to teachers

The system uses admin-defined classroom layouts and uploaded student lists to generate optimized, constraint-satisfying seating arrangements at scale (thousands of students, many classrooms, single institution).

---

## 2. Users & Access Model

| Role | Access | Notes |
|---|---|---|
| Admin (Exam dept / Faculty coordinator) | Full web login, full CRUD, approval workflow | Only role with system login |
| Teachers | No login. Receive duty assignment via email (PDF attachment) | Secondary/passive user |
| Students | No login. Receive/see printed or emailed seating info | Secondary/passive user, view-only via generated PDF |

**Decision:** Admin-only authentication for v1. Teacher/student portals are explicitly out of scope for v1 (see Section 8).

---

## 3. Core Features

### 3.1 Classroom Configuration
- Admin creates/edits/deletes classrooms: name, seating capacity, layout type.
- Layout types are templates, not one-offs:
  - Type 1 → 6×8 grid (48 seats)
  - Type 2 → 5×6 grid (30 seats)
  - Type 3 → Circular layout
  - Admin can define **custom** layout types (rows × columns, or circular with seat count)
- Each layout stores: rows, columns, seat numbering format (e.g., `A1`, `R1C1`), and adjacency map (which seats count as "adjacent" for constraint checking — critical for circular layouts, which don't have simple grid adjacency).

### 3.2 Exam Slot Configuration
- Admin defines exam sessions: date, time slot, duration (e.g., 1.5 hrs), course list, expected students per course.
- Multiple slots per day supported (e.g., morning/afternoon).
- Constraint: no two adjacent seats hold students of the same course.
- Constraint: students distributed evenly across allocated classrooms (no classroom overloaded while another is empty).

### 3.3 Teacher Management
- Admin uploads/maintains teacher list (name, department, contact email).
- Admin marks teacher unavailability (leave dates) manually — no teacher self-service in v1.
- Auto-assignment rules:
  - No teacher assigned two consecutive slots without a gap (configurable gap rule)
  - Duty count balanced across all teachers over the exam period
  - Unavailable teachers excluded from that day's pool

### 3.4 Student Data Upload
- Admin uploads Excel (.xlsx) file per exam session: student name, roll number, course, semester.
- System validates file (required columns, duplicate roll numbers, unknown courses) and reports errors before proceeding.
- Students auto-grouped by course for seating allocation.

### 3.5 Seating Arrangement Generator
- Admin selects: exam session, courses to include, classrooms to use.
- System generates:
  - Seating matrix per classroom (student → seat)
  - Classroom allocation (which classrooms are used, at what capacity)
  - Invigilator-to-classroom-to-slot assignment
- Given large scale (thousands of students), generation runs as a **background job** with a progress indicator, not a blocking request.
- If constraints cannot be fully satisfied (e.g., too many students of one course for capacity), system flags conflicts rather than silently failing.

### 3.6 Output Generation
- PDF seating chart per classroom (visual grid/circle with names + roll numbers)
- Classroom-wise student list (tabular, printable)
- Teacher duty list (printable, per day and per teacher)
- All exports available in bulk (zip of all classroom PDFs for one session)

### 3.7 Email Notification
- Triggered only after admin approval.
- Each teacher receives one email per duty: classroom, date, time slot, duration, PDF attachment (seating chart or duty summary).
- Delivery status tracked (sent/failed) and visible to admin; failed sends retryable.

### 3.8 Admin Approval Workflow
1. Generate plan (background job)
2. Preview plan (seating grid + allocations + invigilators, with conflicts highlighted)
3. Edit manually (drag-and-drop/swap seats or reassign invigilators)
4. Approve
5. Send notifications (async, with delivery tracking)

### 3.9 Dashboard
- Total classrooms, active exam sessions, upcoming slots
- Teacher duty load distribution (chart)
- Conflict count (unresolved seating/invigilation issues) with drill-down
- Recent activity log (uploads, generations, approvals)

---

## 4. Non-Functional Requirements

- **Scale:** Must handle thousands of students and dozens+ of classrooms per exam session without blocking the UI (async processing required).
- **Reliability:** Seating generation must be idempotent/re-runnable without duplicating data; partial failures must be recoverable.
- **Auditability:** All manual edits to a generated plan must be logged (who changed what, when).
- **Data integrity:** Excel upload validation must prevent malformed data from silently corrupting a seating run.
- **Performance target:** Seating generation for ~5,000 students across ~100 classrooms should complete within a few minutes (background job), with progress feedback in the UI.

---

## 5. Assumptions

- Single institution (not multi-tenant) for v1.
- Admin is a trusted internal role; no external self-registration.
- Internet/email connectivity available for notification delivery.
- Institution already has classroom physical layouts that map reasonably to grid or circular templates.

---

## 6. Out of Scope (v1)

- Teacher login/self-service portal (availability marking, swap requests)
- Student login/portal
- Multi-college / multi-tenant support
- Mobile native app (web-responsive only)
- Payment/billing features

---

## 7. Success Metrics

- Time to generate a full seating plan for a large exam session (target: minutes, not hours)
- Reduction in manual seating-chart preparation time vs. current manual process
- Zero same-course-adjacent-seat violations in approved plans
- Email delivery success rate to teachers
