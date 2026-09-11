from rest_framework import serializers
from .models import SeatingPlan, SeatAssignment
from classrooms.serializers import ClassroomSerializer, SeatSerializer
from students.serializers import StudentSerializer
from invigilation.models import InvigilationAssignment
from teachers.serializers import TeacherSerializer


class InvigilationAssignmentSerializer(serializers.ModelSerializer):
    teacher_detail = TeacherSerializer(source="teacher", read_only=True)
    classroom_name = serializers.CharField(source="classroom.name", read_only=True)

    class Meta:
        model = InvigilationAssignment
        fields = ["id", "classroom", "classroom_name", "teacher", "teacher_detail"]


class SeatAssignmentSerializer(serializers.ModelSerializer):
    seat_detail = SeatSerializer(source="seat", read_only=True)
    student_detail = StudentSerializer(source="student", read_only=True)

    class Meta:
        model = SeatAssignment
        fields = ["id", "classroom", "seat", "seat_detail", "student", "student_detail", "is_conflict"]


class SeatingPlanListSerializer(serializers.ModelSerializer):
    slot_label = serializers.CharField(source="slot.label", read_only=True)

    class Meta:
        model = SeatingPlan
        fields = ["id", "exam_session", "slot", "slot_label", "version", "status",
                  "conflict_count", "generated_at"]


class SeatingPlanDetailSerializer(serializers.ModelSerializer):
    assignments = SeatAssignmentSerializer(many=True, read_only=True)
    invigilations = InvigilationAssignmentSerializer(many=True, read_only=True)
    slot_label = serializers.CharField(source="slot.label", read_only=True)

    class Meta:
        model = SeatingPlan
        fields = ["id", "exam_session", "slot", "slot_label", "version", "status",
                  "conflict_count", "generated_at", "acknowledged_conflicts",
                  "assignments", "invigilations"]
