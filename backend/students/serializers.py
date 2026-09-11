from rest_framework import serializers
from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = Student
        fields = ["id", "name", "roll_number", "course", "course_code", "course_name", "semester", "email"]
