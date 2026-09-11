from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from .views import CourseViewSet, ExamSessionViewSet, SlotViewSet

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("sessions", ExamSessionViewSet, basename="examsession")

sessions_router = nested_routers.NestedDefaultRouter(router, "sessions", lookup="session")
sessions_router.register("slots", SlotViewSet, basename="session-slot")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(sessions_router.urls)),
]
