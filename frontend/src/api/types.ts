// ── Core domain types ────────────────────────────────────────────────────────

export interface LayoutType {
  id: number;
  name: string;
  shape: "grid" | "circular";
  rows?: number;
  cols?: number;
  seat_count?: number;
  seat_numbering_format: string;
  capacity: number;
}

export interface Classroom {
  id: number;
  name: string;
  layout_type: number;
  layout_type_detail: LayoutType;
  capacity: number;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  semester: number;
}

export interface SlotCourse {
  id: number;
  course: number;
  course_detail: Course;
  expected_students: number;
}

export interface Slot {
  id: number;
  label: string;
  start_time: string;
  duration_minutes: number;
  order_index: number;
  slot_courses: SlotCourse[];
}

export interface ExamSession {
  id: number;
  name: string;
  date: string;
  duty_gap_slots: number;
  daily_duty_cap: number;
  created_at: string;
  slots: Slot[];
}

export interface Teacher {
  id: number;
  name: string;
  email: string;
  department: string;
  unavailabilities: { id: number; date: string }[];
}

export interface Student {
  id: number;
  name: string;
  roll_number: string;
  course: number;
  course_code: string;
  course_name: string;
  semester: number;
  email: string;
}

export interface SeatDetail {
  id: number;
  label: string;
  row?: number;
  col?: number;
  index?: number;
}

export interface SeatAssignment {
  id: number;
  classroom: number;
  seat: number;
  seat_detail: SeatDetail;
  student: number | null;
  student_detail: Student | null;
  is_conflict: boolean;
}

export interface InvigilationAssignment {
  id: number;
  classroom: number;
  classroom_name: string;
  teacher: number;
  teacher_detail: Teacher;
}

export interface SeatingPlan {
  id: number;
  exam_session: number;
  slot: number;
  slot_label: string;
  version: number;
  status: "draft" | "preview" | "approved";
  conflict_count: number;
  generated_at: string;
  acknowledged_conflicts: boolean;
  assignments?: SeatAssignment[];
  invigilations?: InvigilationAssignment[];
}

export interface Job {
  id: number;
  job_type: string;
  status: "queued" | "running" | "done" | "failed";
  progress_pct: number;
  progress_label: string;
  result_ref?: Record<string, unknown>;
  error_message: string;
  created_at: string;
  finished_at?: string;
}

export interface NotificationLog {
  id: number;
  invigilation: number;
  teacher_name: string;
  classroom_name: string;
  status: "pending" | "sent" | "failed";
  sent_at?: string;
  retry_count: number;
  error_message: string;
}

export interface DashboardSummary {
  total_classrooms: number;
  total_teachers: number;
  active_sessions: number;
  unresolved_conflicts: number;
  duty_distribution: { teacher__id: number; teacher__name: string; duty_count: number }[];
  notification_stats: { sent: number; failed: number; pending: number };
  recent_activity: {
    action: string;
    description: string;
    timestamp: string;
    actor__username: string;
    seating_plan__exam_session__name: string;
  }[];
}
