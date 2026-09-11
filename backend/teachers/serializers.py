from rest_framework import serializers
from .models import Teacher, TeacherUnavailability


class TeacherUnavailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherUnavailability
        fields = ["id", "date"]


class TeacherSerializer(serializers.ModelSerializer):
    unavailabilities = TeacherUnavailabilitySerializer(many=True, read_only=True)

    class Meta:
        model = Teacher
        fields = ["id", "name", "email", "department", "unavailabilities"]
