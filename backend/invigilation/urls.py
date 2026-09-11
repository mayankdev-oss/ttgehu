from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvigilationViewSet

router = DefaultRouter()
router.register("", InvigilationViewSet, basename="invigilation")
urlpatterns = [path("", include(router.urls))]
