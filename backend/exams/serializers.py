from rest_framework import serializers
from .models import Course, ExamSession, Slot, SlotCourse


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "code", "name", "semester"]


class SlotCourseSerializer(serializers.ModelSerializer):
    course_detail = CourseSerializer(source="course", read_only=True)

    class Meta:
        model = SlotCourse
        fields = ["id", "course", "course_detail", "expected_students"]


class SlotSerializer(serializers.ModelSerializer):
    slot_courses = SlotCourseSerializer(many=True, read_only=True)

    class Meta:
        model = Slot
        fields = ["id", "label", "start_time", "duration_minutes", "order_index", "slot_courses"]


class ExamSessionSerializer(serializers.ModelSerializer):
    slots = SlotSerializer(many=True, read_only=True)

    class Meta:
        model = ExamSession
        fields = ["id", "name", "date", "duty_gap_slots", "daily_duty_cap", "created_at", "slots"]
