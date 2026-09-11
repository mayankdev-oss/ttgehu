from django.db import models


class Teacher(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} ({self.department})"


class TeacherUnavailability(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="unavailabilities")
    date = models.DateField()

    class Meta:
        unique_together = [("teacher", "date")]

    def __str__(self):
        return f"{self.teacher.name} unavailable on {self.date}"
