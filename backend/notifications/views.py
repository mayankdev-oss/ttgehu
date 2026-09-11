from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from notifications.models import NotificationLog
from invigilation.models import InvigilationAssignment
from notifications.tasks import send_duty_notification


class NotificationLogSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="invigilation.teacher.name", read_only=True)
    classroom_name = serializers.CharField(source="invigilation.classroom.name", read_only=True)

    class Meta:
        model = NotificationLog
        fields = ["id", "invigilation", "teacher_name", "classroom_name",
                  "status", "sent_at", "retry_count", "error_message"]


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NotificationLog.objects.select_related(
        "invigilation__teacher", "invigilation__classroom"
    ).all()
    serializer_class = NotificationLogSerializer

    @action(detail=True, methods=["post"], url_path="resend")
    def resend(self, request, pk=None):
        log = self.get_object()
        if log.status == NotificationLog.Status.SENT:
            return Response({"error": "Already sent."}, status=status.HTTP_400_BAD_REQUEST)
        send_duty_notification.delay(log.invigilation_id)
        log.status = NotificationLog.Status.PENDING
        log.save(update_fields=["status"])
        return Response({"queued": True})
