from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.db.models import Count, Q
from exams.models import ExamSession
from seating.models import SeatingPlan
from classrooms.models import Classroom
from teachers.models import Teacher
from invigilation.models import InvigilationAssignment
from notifications.models import NotificationLog
from audit.models import AuditLog


@api_view(["GET"])
def dashboard_summary(request):
    total_classrooms = Classroom.objects.count()
    total_teachers = Teacher.objects.count()
    active_sessions = ExamSession.objects.filter(
        seating_plans__status__in=["draft", "preview"]
    ).distinct().count()
    unresolved_conflicts = SeatingPlan.objects.filter(
        status__in=["draft", "preview"],
        conflict_count__gt=0,
    ).aggregate(total=Count("conflict_count"))["total"] or 0

    # Duty load distribution per teacher (across all sessions)
    duty_dist = (
        InvigilationAssignment.objects.values(
            "teacher__id", "teacher__name", "teacher__department"
        )
        .annotate(duty_count=Count("id"))
        .order_by("-duty_count")[:20]
    )

    # Email delivery stats
    notif_stats = NotificationLog.objects.aggregate(
        sent=Count("id", filter=Q(status="sent")),
        failed=Count("id", filter=Q(status="failed")),
        pending=Count("id", filter=Q(status="pending")),
    )

    # Recent activity (last 10 audit logs)
    recent_activity = list(
        AuditLog.objects.select_related("actor", "seating_plan__exam_session")
        .values("action", "description", "timestamp",
                "actor__username", "seating_plan__exam_session__name")
        .order_by("-timestamp")[:10]
    )

    return Response({
        "total_classrooms": total_classrooms,
        "total_teachers": total_teachers,
        "active_sessions": active_sessions,
        "unresolved_conflicts": unresolved_conflicts,
        "duty_distribution": list(duty_dist),
        "notification_stats": notif_stats,
        "recent_activity": recent_activity,
    })
