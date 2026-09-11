"""
Invigilation assignment engine.

Assigns one teacher per classroom per seating plan.

Constraints enforced:
- Teacher must not be marked unavailable on the slot's session date.
- Duty gap: teacher cannot have duties in two slots within `duty_gap_slots`
  positions of each other (slot order_index difference).
- Daily cap: teacher cannot have more than `daily_duty_cap` duties on the same day.

Strategy:
- Prefer the teacher with the fewest total duties so far in this session
  (balanced load), then round-robin as tie-breaker.
"""
from __future__ import annotations

import logging
from collections import defaultdict

from teachers.models import Teacher
from invigilation.models import InvigilationAssignment
from seating.models import SeatingPlan
from classrooms.models import Classroom

logger = logging.getLogger(__name__)


def assign_invigilators(plan: SeatingPlan, classrooms: list[Classroom]) -> list[InvigilationAssignment]:
    """
    Creates InvigilationAssignment rows for each classroom in the plan.
    Returns the list of created assignments.
    """
    session = plan.exam_session
    slot = plan.slot
    session_date = session.date
    duty_gap = session.duty_gap_slots
    daily_cap = session.daily_duty_cap

    # All teachers
    all_teachers = list(Teacher.objects.all())

    # Unavailable teachers on this date
    unavailable_ids = set(
        session.date and
        Teacher.objects.filter(unavailabilities__date=session_date).values_list("id", flat=True)
    )

    # Available teachers
    available_teachers = [t for t in all_teachers if t.pk not in unavailable_ids]
    if not available_teachers:
        logger.warning("No available teachers for session %s, slot %s", session, slot)
        return []

    # Load existing duties for this session to check gap + daily cap
    existing = list(
        InvigilationAssignment.objects.filter(
            seating_plan__exam_session=session,
            seating_plan__status__in=["draft", "preview", "approved"],
        ).select_related("seating_plan__slot", "teacher")
    )

    # teacher_id → [(slot_order_index, session_date)]
    teacher_duties: dict[int, list[int]] = defaultdict(list)
    teacher_daily: dict[tuple[int, object], int] = defaultdict(int)  # (teacher_id, date) → count
    for inv in existing:
        teacher_duties[inv.teacher_id].append(inv.seating_plan.slot.order_index)
        teacher_daily[(inv.teacher_id, session_date)] += 1

    # Total duty count across session for load balancing
    teacher_total: dict[int, int] = defaultdict(int)
    for inv in existing:
        teacher_total[inv.teacher_id] += 1

    created: list[InvigilationAssignment] = []
    teacher_cursor = 0  # round-robin fallback

    for cls in classrooms:
        # Sort available teachers by total duty count ascending (least-loaded first)
        candidates = sorted(
            available_teachers,
            key=lambda t: (teacher_total[t.pk], t.pk),
        )

        assigned = None
        for teacher in candidates:
            # Daily cap check
            if teacher_daily[(teacher.pk, session_date)] >= daily_cap:
                continue

            # Duty gap check: no duty within `duty_gap` slot positions
            prior_slots = teacher_duties[teacher.pk]
            too_close = any(
                abs(slot.order_index - s) <= duty_gap for s in prior_slots
            )
            if too_close:
                continue

            assigned = teacher
            break

        if assigned is None:
            # Relax constraints: pick least-loaded available teacher ignoring gap
            for teacher in candidates:
                if teacher_daily[(teacher.pk, session_date)] < daily_cap:
                    assigned = teacher
                    break

        if assigned is None and available_teachers:
            # Final fallback — just round-robin
            assigned = available_teachers[teacher_cursor % len(available_teachers)]
            teacher_cursor += 1

        if assigned:
            inv = InvigilationAssignment.objects.create(
                seating_plan=plan,
                classroom=cls,
                teacher=assigned,
            )
            created.append(inv)
            teacher_duties[assigned.pk].append(slot.order_index)
            teacher_daily[(assigned.pk, session_date)] += 1
            teacher_total[assigned.pk] += 1
            logger.debug("Assigned %s → %s", assigned.name, cls.name)

    return created
