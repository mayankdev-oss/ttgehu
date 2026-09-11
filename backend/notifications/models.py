from django.db import models
from invigilation.models import InvigilationAssignment


class NotificationLog(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    invigilation = models.ForeignKey(
        InvigilationAssignment, on_delete=models.CASCADE, related_name="notification_logs"
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    sent_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"Notification [{self.status}] for {self.invigilation}"
