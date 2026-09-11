from django.db import models


class Job(models.Model):
    """Tracks any long-running background Celery task."""

    class JobType(models.TextChoices):
        SEATING_GEN = "seating_gen", "Seating Generation"
        PDF_GEN = "pdf_gen", "PDF Generation"
        EXCEL_PARSE = "excel_parse", "Excel Parse"
        EMAIL_BATCH = "email_batch", "Email Batch"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    job_type = models.CharField(max_length=20, choices=JobType.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.QUEUED)
    celery_task_id = models.CharField(max_length=255, blank=True)
    progress_pct = models.PositiveSmallIntegerField(default=0)
    progress_label = models.CharField(max_length=255, blank=True)
    # JSON blob for any extra result data (e.g. zip file path, conflict count)
    result_ref = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_job_type_display()} [{self.status}] #{self.pk}"
