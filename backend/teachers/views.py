from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Teacher, TeacherUnavailability
from .serializers import TeacherSerializer, TeacherUnavailabilitySerializer


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.prefetch_related("unavailabilities").all()
    serializer_class = TeacherSerializer

    @action(detail=True, methods=["post", "delete"], url_path="unavailability")
    def unavailability(self, request, pk=None):
        teacher = self.get_object()
        date = request.data.get("date")
        if not date:
            return Response({"error": "date required"}, status=status.HTTP_400_BAD_REQUEST)

        if request.method == "POST":
            obj, created = TeacherUnavailability.objects.get_or_create(
                teacher=teacher, date=date
            )
            return Response(
                TeacherUnavailabilitySerializer(obj).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )
        else:  # DELETE
            TeacherUnavailability.objects.filter(teacher=teacher, date=date).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
