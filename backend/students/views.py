from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from exams.models import ExamSession
from jobs.models import Job
from .models import Student
from .serializers import StudentSerializer
from .tasks import parse_student_excel, validate_file


class StudentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentSerializer

    def get_queryset(self):
        return Student.objects.filter(
            exam_session_id=self.kwargs["session_pk"]
        ).select_related("course")

    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request, session_pk=None):
        session = get_object_or_404(ExamSession, pk=session_pk)
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Pre-parse validation
        file_errors = validate_file(file)
        if file_errors:
            return Response({"errors": file_errors}, status=status.HTTP_400_BAD_REQUEST)

        # Create a Job record
        job = Job.objects.create(
            job_type=Job.JobType.EXCEL_PARSE,
            progress_label="Queued…",
        )

        # Enqueue async parse
        file_bytes = file.read()
        parse_student_excel.delay(session.pk, file_bytes, job.pk)

        return Response({"job_id": job.pk}, status=status.HTTP_202_ACCEPTED)
