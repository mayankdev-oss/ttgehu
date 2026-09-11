from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LayoutTypeViewSet, ClassroomViewSet

router = DefaultRouter()
router.register("layout-types", LayoutTypeViewSet, basename="layouttype")
router.register("", ClassroomViewSet, basename="classroom")

urlpatterns = [path("", include(router.urls))]
