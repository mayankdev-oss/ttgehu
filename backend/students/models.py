from django.db import models


class Student(models.Model):
    """
    Session-scoped: re-uploaded per ExamSession.
    The same physical student may have multiple rows across sessions.
    """
    exam_session = models.ForeignKey(
        "exams.ExamSession", on_delete=models.CASCADE, related_name="students"
    )
    name = models.CharField(max_length=200)
    roll_number = models.CharField(max_length=50)
    course = models.ForeignKey("exams.Course", on_delete=models.CASCADE, related_name="students")
    semester = models.PositiveSmallIntegerField()
    email = models.EmailField(blank=True)  # optional — not used for notifications in v1

    class Meta:
        unique_together = [("exam_session", "roll_number")]
        indexes = [
            models.Index(fields=["exam_session", "course"]),
        ]

    def __str__(self):
        return f"{self.roll_number} – {self.name} ({self.course.code})"
