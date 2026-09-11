from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import LayoutType, Classroom, Seat
from .serializers import LayoutTypeSerializer, ClassroomSerializer, SeatSerializer
from .adjacency import precompute_adjacency


class LayoutTypeViewSet(viewsets.ModelViewSet):
    queryset = LayoutType.objects.all()
    serializer_class = LayoutTypeSerializer

    def perform_create(self, serializer):
        lt = serializer.save()
        precompute_adjacency(lt)

    def perform_update(self, serializer):
        lt = serializer.save()
        precompute_adjacency(lt)

    @action(detail=True, methods=["get"])
    def seats(self, request, pk=None):
        lt = self.get_object()
        seats = lt.seats.all().order_by("row", "col", "index")
        return Response(SeatSerializer(seats, many=True).data)


class ClassroomViewSet(viewsets.ModelViewSet):
    queryset = Classroom.objects.select_related("layout_type").all()
    serializer_class = ClassroomSerializer
