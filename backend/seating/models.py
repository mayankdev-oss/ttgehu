from django.db import models
from exams.models import ExamSession, Slot
from classrooms.models import Classroom, Seat


class SeatingPlan(models.Model):
    """
    A versioned seating plan for one Slot of an ExamSession.
    Each regeneration increments the version; old versions are kept for audit.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PREVIEW = "preview", "Preview"
        APPROVED = "approved", "Approved"

    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name="seating_plans")
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name="seating_plans")
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    conflict_count = models.PositiveIntegerField(default=0)
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, related_name="generated_plans"
    )
    # Set when admin approves despite conflicts
    acknowledged_conflicts = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="acknowledged_plans"
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    # Link to the generation Job
    job = models.OneToOneField("jobs.Job", on_delete=models.SET_NULL, null=True, blank=True, related_name="seating_plan")

    class Meta:
        ordering = ["-version"]
        unique_together = [("exam_session", "slot", "version")]

    def __str__(self):
        return f"{self.exam_session} / {self.slot.label} v{self.version} [{self.status}]"


class SeatAssignment(models.Model):
    """
    Maps one seat in one classroom to one student, within a SeatingPlan.
    student=None means the seat is intentionally left empty.
    is_conflict=True means this student could not be placed without violating a constraint.
    """
    seating_plan = models.ForeignKey(SeatingPlan, on_delete=models.CASCADE, related_name="assignments")
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE)
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE)
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, null=True, blank=True
    )
    is_conflict = models.BooleanField(default=False)

    class Meta:
        unique_together = [("seating_plan", "classroom", "seat")]
        indexes = [
            models.Index(fields=["seating_plan", "classroom"]),
        ]

    def __str__(self):
        student_str = self.student.roll_number if self.student else "empty"
        return f"{self.classroom.name} / {self.seat.label} → {student_str}"
