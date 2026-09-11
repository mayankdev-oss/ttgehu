from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class AuditLog(models.Model):
    """
    Records every manual change made to a SeatingPlan after generation —
    seat swaps, invigilator reassignments, etc.
    """
    seating_plan = models.ForeignKey(
        "seating.SeatingPlan", on_delete=models.CASCADE, related_name="audit_logs"
    )
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)   # e.g. "swap_seats", "reassign_invigilator"
    description = models.TextField()           # human-readable summary
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.action} by {self.actor}"
