from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Course, ExamSession, Slot, SlotCourse
from .serializers import CourseSerializer, ExamSessionSerializer, SlotSerializer, SlotCourseSerializer


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer


class ExamSessionViewSet(viewsets.ModelViewSet):
    queryset = ExamSession.objects.prefetch_related("slots__slot_courses__course").all()
    serializer_class = ExamSessionSerializer


class SlotViewSet(viewsets.ModelViewSet):
    serializer_class = SlotSerializer

    def get_queryset(self):
        return Slot.objects.filter(
            exam_session_id=self.kwargs["session_pk"]
        ).prefetch_related("slot_courses__course")

    def perform_create(self, serializer):
        serializer.save(exam_session_id=self.kwargs["session_pk"])

    @action(detail=True, methods=["post"], url_path="add-course")
    def add_course(self, request, session_pk=None, pk=None):
        slot = self.get_object()
        course_id = request.data.get("course_id")
        expected = request.data.get("expected_students", 0)
        if not course_id:
            return Response({"error": "course_id required"}, status=status.HTTP_400_BAD_REQUEST)
        sc, _ = SlotCourse.objects.get_or_create(
            slot=slot, course_id=course_id, defaults={"expected_students": expected}
        )
        return Response(SlotCourseSerializer(sc).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"remove-course/(?P<course_id>\d+)")
    def remove_course(self, request, session_pk=None, pk=None, course_id=None):
        slot = self.get_object()
        SlotCourse.objects.filter(slot=slot, course_id=course_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
