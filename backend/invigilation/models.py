from django.db import models
from seating.models import SeatingPlan
from classrooms.models import Classroom
from teachers.models import Teacher
from exams.models import Slot


class InvigilationAssignment(models.Model):
    """One teacher assigned to invigilate one classroom during one seating plan."""
    seating_plan = models.ForeignKey(SeatingPlan, on_delete=models.CASCADE, related_name="invigilations")
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)

    class Meta:
        unique_together = [("seating_plan", "classroom")]
        indexes = [
            models.Index(fields=["teacher", "seating_plan"]),
        ]

    def __str__(self):
        return f"{self.teacher.name} → {self.classroom.name} [{self.seating_plan}]"
