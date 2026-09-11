"""
Celery tasks for sending teacher duty notification emails.
One task per invigilation assignment, parallelisable.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from celery import shared_task
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

from invigilation.models import InvigilationAssignment
from notifications.models import NotificationLog

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


@shared_task(bind=True, max_retries=MAX_RETRIES)
def send_duty_notification(self, invigilation_id: int) -> None:
    """
    Send one duty notification email to the assigned teacher.
    Retries with exponential backoff on failure.
    """
    try:
        inv = InvigilationAssignment.objects.select_related(
            "teacher",
            "classroom",
            "seating_plan__exam_session",
            "seating_plan__slot",
        ).get(pk=invigilation_id)

        log, _ = NotificationLog.objects.get_or_create(invigilation=inv)
        log.status = NotificationLog.Status.PENDING
        log.save(update_fields=["status"])

        # Build student list for the body / PDF
        from seating.models import SeatAssignment
        assignments = (
            SeatAssignment.objects.filter(
                seating_plan=inv.seating_plan,
                classroom=inv.classroom,
                is_conflict=False,
            )
            .select_related("student__course", "seat")
            .order_by("seat__row", "seat__col", "seat__index")
        )

        body = render_to_string(
            "notifications/duty_email.txt",
            {
                "teacher": inv.teacher,
                "classroom": inv.classroom,
                "slot": inv.seating_plan.slot,
                "session": inv.seating_plan.exam_session,
                "assignments": assignments,
            },
        )

        email = EmailMessage(
            subject=f"Exam Duty — {inv.seating_plan.exam_session.name} / {inv.seating_plan.slot.label}",
            body=body,
            to=[inv.teacher.email],
        )
        email.send(fail_silently=False)

        log.status = NotificationLog.Status.SENT
        log.sent_at = datetime.now(timezone.utc)
        log.save(update_fields=["status", "sent_at"])
        logger.info("Duty email sent to %s", inv.teacher.email)

    except Exception as exc:
        log = NotificationLog.objects.filter(invigilation_id=invigilation_id).first()
        if log:
            log.retry_count += 1
            log.error_message = str(exc)
            log.status = NotificationLog.Status.FAILED
            log.save(update_fields=["retry_count", "error_message", "status"])

        logger.warning("Duty email failed (attempt %d): %s", self.request.retries + 1, exc)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)
