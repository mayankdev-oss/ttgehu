from django.db import models


class Course(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    semester = models.PositiveSmallIntegerField()

    def __str__(self):
        return f"{self.code} – {self.name}"


class ExamSession(models.Model):
    """
    A named exam period (e.g. "End Semester Nov 2026").
    Holds per-session invigilation constraint defaults.
    """
    name = models.CharField(max_length=200)
    date = models.DateField()
    duty_gap_slots = models.PositiveSmallIntegerField(
        default=1,
        help_text="Minimum number of slots between a teacher's consecutive duties",
    )
    daily_duty_cap = models.PositiveSmallIntegerField(
        default=2,
        help_text="Max duties per teacher per day in this session",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.date})"


class Slot(models.Model):
    """
    A single exam time slot within an ExamSession.
    order_index controls the slot ordering (morning < afternoon etc.)
    """
    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name="slots")
    label = models.CharField(max_length=50, help_text="e.g. 'Morning', 'Afternoon'")
    start_time = models.TimeField()
    duration_minutes = models.PositiveSmallIntegerField()
    order_index = models.PositiveSmallIntegerField(default=0)
    courses = models.ManyToManyField(Course, through="SlotCourse", related_name="slots")

    class Meta:
        ordering = ["exam_session", "order_index"]
        unique_together = [("exam_session", "order_index")]

    def __str__(self):
        return f"{self.exam_session.name} – {self.label} ({self.start_time})"


class SlotCourse(models.Model):
    """
    Explicit join between Slot and Course, carrying extra metadata.
    expected_students is informational — actual count comes from Student upload.
    """
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name="slot_courses")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="slot_courses")
    expected_students = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = [("slot", "course")]

    def __str__(self):
        return f"{self.slot} – {self.course.code}"
