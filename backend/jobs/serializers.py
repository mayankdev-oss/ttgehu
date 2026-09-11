from rest_framework import serializers
from .models import Job


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ["id", "job_type", "status", "progress_pct", "progress_label",
                  "result_ref", "error_message", "created_at", "finished_at"]
        read_only_fields = fields
