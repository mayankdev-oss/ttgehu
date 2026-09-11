from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from audit.models import AuditLog
from classrooms.models import Classroom
from invigilation.models import InvigilationAssignment
from jobs.models import Job
from notifications.tasks import send_duty_notification
from .models import SeatingPlan, SeatAssignment
from .serializers import (
    SeatingPlanListSerializer,
    SeatingPlanDetailSerializer,
    SeatAssignmentSerializer,
    InvigilationAssignmentSerializer,
)
from .tasks import run_seating_generation


class SeatingPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only list/detail.  Generation, swaps, and approval are separate actions.
    """

    def get_queryset(self):
        return SeatingPlan.objects.filter(
            exam_session_id=self.kwargs.get("session_pk"),
            slot_id=self.kwargs.get("slot_pk"),
        ).select_related("exam_session", "slot").order_by("-version")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SeatingPlanDetailSerializer
        return SeatingPlanListSerializer

    # ── POST /generate ─────────────────────────────────────────────────────
    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request, session_pk=None, slot_pk=None):
        """
        Enqueue a seating generation job.
        If a draft/preview plan exists, require 'discard_existing=true'.
        """
        classroom_ids = request.data.get("classroom_ids", [])
        if not classroom_ids:
            return Response({"error": "classroom_ids required"}, status=status.HTTP_400_BAD_REQUEST)

        existing_draft = SeatingPlan.objects.filter(
            exam_session_id=session_pk,
            slot_id=slot_pk,
            status__in=[SeatingPlan.Status.DRAFT, SeatingPlan.Status.PREVIEW],
        ).order_by("-version").first()

        if existing_draft and not request.data.get("discard_existing"):
            return Response(
                {
                    "error": "A draft/preview plan already exists.",
                    "existing_plan_id": existing_draft.pk,
                    "existing_version": existing_draft.version,
                    "requires_confirmation": True,
                },
                status=status.HTTP_409_CONFLICT,
            )

        # Determine new version number
        latest = SeatingPlan.objects.filter(
            exam_session_id=session_pk, slot_id=slot_pk
        ).order_by("-version").first()
        new_version = (latest.version + 1) if latest else 1

        job = Job.objects.create(job_type=Job.JobType.SEATING_GEN, progress_label="Queued…")
        plan = SeatingPlan.objects.create(
            exam_session_id=session_pk,
            slot_id=slot_pk,
            version=new_version,
            status=SeatingPlan.Status.DRAFT,
            generated_by=request.user,
            job=job,
        )

        run_seating_generation.delay(plan.pk, classroom_ids, job.pk)
        return Response({"plan_id": plan.pk, "job_id": job.pk, "version": new_version},
                        status=status.HTTP_202_ACCEPTED)

    # ── POST /{id}/swap ─────────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="swap")
    def swap(self, request, session_pk=None, slot_pk=None, pk=None):
        """
        Atomic same-classroom swap of two seat assignments.
        Body: { assignment_a_id, assignment_b_id }
        Returns soft warnings if the swap introduces new conflicts.
        """
        plan = self.get_object()
        if plan.status == SeatingPlan.Status.APPROVED:
            return Response({"error": "Cannot edit an approved plan."}, status=status.HTTP_400_BAD_REQUEST)

        a_id = request.data.get("assignment_a_id")
        b_id = request.data.get("assignment_b_id")
        if not a_id or not b_id:
            return Response({"error": "assignment_a_id and assignment_b_id required"},
                            status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                a = SeatAssignment.objects.select_for_update().get(pk=a_id, seating_plan=plan)
                b = SeatAssignment.objects.select_for_update().get(pk=b_id, seating_plan=plan)
            except SeatAssignment.DoesNotExist:
                return Response({"error": "Assignment not found in this plan."},
                                status=status.HTTP_404_NOT_FOUND)

            if a.classroom_id != b.classroom_id:
                return Response({"error": "Cross-classroom swaps are not supported in v1."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Record audit before swap
            old_a = {"seat": a.seat_id, "student": a.student_id}
            old_b = {"seat": b.seat_id, "student": b.student_id}

            # Perform swap
            a.student, b.student = b.student, a.student
            a.is_conflict, b.is_conflict = b.is_conflict, a.is_conflict
            a.save(update_fields=["student", "is_conflict"])
            b.save(update_fields=["student", "is_conflict"])

            AuditLog.objects.create(
                seating_plan=plan,
                actor=request.user,
                action="swap_seats",
                description=(
                    f"Swapped students between seat {a.seat.label} and {b.seat.label} "
                    f"in {a.classroom.name}"
                ),
                old_value={"a": old_a, "b": old_b},
                new_value={"a": {"seat": a.seat_id, "student": a.student_id},
                           "b": {"seat": b.seat_id, "student": b.student_id}},
            )

        # Soft-warn: check if either new placement violates adjacency
        warnings = _check_swap_warnings(plan, a, b)

        return Response({
            "assignment_a": SeatAssignmentSerializer(a).data,
            "assignment_b": SeatAssignmentSerializer(b).data,
            "warnings": warnings,
        })

    # ── POST /{id}/approve ──────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, session_pk=None, slot_pk=None, pk=None):
        """
        Approve the plan and trigger per-duty notification emails.
        If conflict_count > 0, requires acknowledged_conflicts=true.
        """
        plan = self.get_object()
        if plan.status == SeatingPlan.Status.APPROVED:
            return Response({"error": "Already approved."}, status=status.HTTP_400_BAD_REQUEST)

        if plan.conflict_count > 0 and not request.data.get("acknowledged_conflicts"):
            return Response(
                {
                    "error": f"Plan has {plan.conflict_count} unresolved conflict(s). "
                             "Set acknowledged_conflicts=true to approve anyway.",
                    "conflict_count": plan.conflict_count,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan.status = SeatingPlan.Status.APPROVED
        plan.acknowledged_conflicts = bool(request.data.get("acknowledged_conflicts"))
        plan.acknowledged_by = request.user
        plan.acknowledged_at = timezone.now()
        plan.save(update_fields=["status", "acknowledged_conflicts", "acknowledged_by", "acknowledged_at"])

        # Fire per-duty email tasks
        inv_ids = InvigilationAssignment.objects.filter(
            seating_plan=plan
        ).values_list("pk", flat=True)
        for inv_id in inv_ids:
            send_duty_notification.delay(inv_id)

        return Response({"status": "approved", "notifications_queued": len(inv_ids)})


def _check_swap_warnings(plan: SeatingPlan, a: SeatAssignment, b: SeatAssignment) -> list[str]:
    """Check if either new seat placement violates adjacency constraints."""
    from classrooms.models import SeatAdjacency
    warnings = []
    for assignment in [a, b]:
        if not assignment.student:
            continue
        course_id = assignment.student.course_id
        neighbour_ids = SeatAdjacency.objects.filter(
            seat=assignment.seat
        ).values_list("adjacent_seat_id", flat=True)
        conflicting = SeatAssignment.objects.filter(
            seating_plan=plan,
            classroom=assignment.classroom,
            seat_id__in=neighbour_ids,
            student__course_id=course_id,
        ).exclude(pk=assignment.pk).exists()
        if conflicting:
            warnings.append(
                f"Seat {assignment.seat.label}: adjacent seat has a student from the same course."
            )
    return warnings
