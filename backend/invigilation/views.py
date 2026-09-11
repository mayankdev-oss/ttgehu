from rest_framework import viewsets
from invigilation.models import InvigilationAssignment
from seating.serializers import InvigilationAssignmentSerializer


class InvigilationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvigilationAssignmentSerializer

    def get_queryset(self):
        return InvigilationAssignment.objects.select_related(
            "teacher", "classroom", "seating_plan"
        ).all()
