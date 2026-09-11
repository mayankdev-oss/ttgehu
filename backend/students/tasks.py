"""
Excel upload validation and async parse task for student data.
"""
from __future__ import annotations

import io
import logging
from typing import Any

import pandas as pd
from celery import shared_task
from django.utils import timezone

from exams.models import ExamSession, Course
from jobs.models import Job
from students.models import Student

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {"name", "roll_number", "course_code", "semester"}
ALLOWED_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def validate_file(file_obj) -> list[str]:
    """Quick pre-parse checks (size + mime)."""
    errors = []
    if file_obj.size > MAX_FILE_SIZE:
        errors.append(f"File too large ({file_obj.size // 1024 // 1024} MB). Max 20 MB.")
    ct = getattr(file_obj, "content_type", "")
    if ct and ct not in ALLOWED_MIME_TYPES:
        errors.append(f"Invalid file type: {ct}. Upload an .xlsx file.")
    return errors


@shared_task(bind=True, max_retries=0)
def parse_student_excel(self, session_id: int, file_bytes: bytes, job_id: int) -> dict:
    """
    Parse and validate an Excel file, then bulk-create Student rows.
    Reports row-level errors without aborting the whole import.
    """
    from datetime import datetime

    job = Job.objects.get(pk=job_id)
    job.status = Job.Status.RUNNING
    job.celery_task_id = self.request.id or ""
    job.save(update_fields=["status", "celery_task_id"])

    try:
        session = ExamSession.objects.get(pk=session_id)
        course_map = {c.code: c for c in Course.objects.all()}

        df = pd.read_excel(io.BytesIO(file_bytes), dtype=str)
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        missing = REQUIRED_COLUMNS - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

        total = len(df)
        row_errors: list[dict] = []
        to_create: list[Student] = []
        seen_rolls: set[str] = set()

        for i, row in df.iterrows():
            row_num = i + 2  # 1-indexed, header is row 1
            errs = []

            name = str(row.get("name", "")).strip()
            roll = str(row.get("roll_number", "")).strip()
            code = str(row.get("course_code", "")).strip()
            sem_raw = str(row.get("semester", "")).strip()

            if not name:
                errs.append("name is blank")
            if not roll:
                errs.append("roll_number is blank")
            elif roll in seen_rolls:
                errs.append(f"duplicate roll_number '{roll}'")
            if code not in course_map:
                errs.append(f"unknown course_code '{code}'")
            try:
                sem = int(sem_raw)
                if sem < 1 or sem > 12:
                    raise ValueError
            except ValueError:
                errs.append(f"invalid semester '{sem_raw}'")
                sem = 0

            if errs:
                row_errors.append({"row": row_num, "roll_number": roll, "errors": errs})
                continue

            seen_rolls.add(roll)
            to_create.append(
                Student(
                    exam_session=session,
                    name=name,
                    roll_number=roll,
                    course=course_map[code],
                    semester=sem,
                    email=str(row.get("email", "")).strip(),
                )
            )

            if (i + 1) % 100 == 0:
                pct = int(10 + ((i + 1) / total) * 80)
                Job.objects.filter(pk=job_id).update(
                    progress_pct=pct,
                    progress_label=f"Validating rows… {i + 1}/{total}",
                )

        # Delete existing students for this session before re-import
        Student.objects.filter(exam_session=session).delete()
        Student.objects.bulk_create(to_create, batch_size=500)

        result = {
            "imported": len(to_create),
            "errors": row_errors,
            "total_rows": total,
        }
        Job.objects.filter(pk=job_id).update(
            status=Job.Status.DONE,
            progress_pct=100,
            progress_label=f"Done — {len(to_create)} students imported, {len(row_errors)} errors",
            result_ref=result,
            finished_at=datetime.now(),
        )
        return result

    except Exception as exc:
        logger.exception("Excel parse failed for session %s", session_id)
        Job.objects.filter(pk=job_id).update(
            status=Job.Status.FAILED,
            error_message=str(exc),
            finished_at=timezone.now(),
        )
        raise
