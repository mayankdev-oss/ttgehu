from django.urls import path
from .views import classroom_pdf, bulk_zip_export

urlpatterns = [
    path("plans/<int:plan_id>/classrooms/<int:classroom_id>/pdf/", classroom_pdf, name="classroom-pdf"),
    path("plans/<int:plan_id>/zip/", bulk_zip_export, name="bulk-zip-export"),
]
