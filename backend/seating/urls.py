from django.urls import path, include
from rest_framework_nested import routers as nested_routers
from rest_framework.routers import DefaultRouter
from .views import SeatingPlanViewSet

# Seating plans are nested under sessions→slots
# /api/exams/sessions/{session_pk}/slots/{slot_pk}/plans/
router = DefaultRouter()
router.register("", SeatingPlanViewSet, basename="seatingplan")
urlpatterns = [path("", include(router.urls))]
