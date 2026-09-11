from django.urls import path, include
from rest_framework_nested import routers as nested_routers
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet

# Students are nested under exam sessions: /api/exams/sessions/{session_pk}/students/
# But we also expose them from the students app URL for the nested router registration.
# The actual nesting is done in exams/urls.py; this file exposes the ViewSet.

router = DefaultRouter()
router.register("", StudentViewSet, basename="student")
urlpatterns = [path("", include(router.urls))]
