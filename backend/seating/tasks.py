"""
Celery tasks for seating plan generation.
Chains: generate_seating_task → assign_invigilators_task
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from celery import shared_task

from jobs.models import Job
from seating.models import SeatingPlan
from classrooms.models import Classroom

logger = logging.getLogger(__name__)


def _update_job(job_id: int, pct: int, label: str, status: str = Job.Status.RUNNING) -> None:
    Job.objects.filter(pk=job_id).update(
        progress_pct=pct,
        progress_label=label,
        status=status,
    )


@shared_task(bind=True, max_retries=0)
def run_seating_generation(self, plan_id: int, classroom_ids: list[int], job_id: int) -> dict:
    """
    Main seating + invigilation generation task.
    Updates Job progress throughout.
    """
    from seating.engine import generate_seating
    from invigilation.engine import assign_invigilators

    job = Job.objects.get(pk=job_id)
    job.celery_task_id = self.request.id or ""
    job.status = Job.Status.RUNNING
    job.save(update_fields=["celery_task_id", "status"])

    try:
        plan = SeatingPlan.objects.select_related("exam_session", "slot").get(pk=plan_id)
        classrooms = list(Classroom.objects.filter(pk__in=classroom_ids).select_related("layout_type"))

        _update_job(job_id, 5, "Loading student data…")

        total_students = plan.exam_session.students.filter(
            course__slots=plan.slot
        ).count()

        def progress_cb(placed: int, total: int, label: str) -> None:
            pct = int(10 + (placed / max(total, 1)) * 70)
            _update_job(job_id, pct, f"{label} {placed}/{total}")

        _update_job(job_id, 10, "Generating seating arrangement…")
        result = generate_seating(plan, classrooms, progress_callback=progress_cb)

        _update_job(job_id, 82, "Assigning invigilators…")
        assign_invigilators(plan, classrooms)

        # Update plan conflict count and status
        conflict_count = len(result.conflicts)
        plan.conflict_count = conflict_count
        plan.status = SeatingPlan.Status.PREVIEW
        plan.save(update_fields=["conflict_count", "status"])

        _update_job(
            job_id, 100,
            f"Done — {result.total_placed} placed, {conflict_count} conflicts",
            status=Job.Status.DONE,
        )
        Job.objects.filter(pk=job_id).update(finished_at=datetime.now(timezone.utc))

        return {
            "plan_id": plan_id,
            "placed": result.total_placed,
            "conflicts": conflict_count,
        }

    except Exception as exc:
        logger.exception("Seating generation failed for plan %s", plan_id)
        Job.objects.filter(pk=job_id).update(
            status=Job.Status.FAILED,
            error_message=str(exc),
            finished_at=datetime.now(timezone.utc),
        )
        raise
