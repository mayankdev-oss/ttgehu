import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/classrooms/", include("classrooms.urls")),
    path("api/exams/", include("exams.urls")),
    path("api/students/", include("students.urls")),
    path("api/teachers/", include("teachers.urls")),
    path("api/seating/", include("seating.urls")),
    path("api/invigilation/", include("invigilation.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/exports/", include("exports.urls")),
    path("api/jobs/", include("jobs.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/auth/", include("django.contrib.auth.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
