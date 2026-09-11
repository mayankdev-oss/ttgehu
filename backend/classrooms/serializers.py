from rest_framework import serializers
from .models import LayoutType, Classroom, Seat


class LayoutTypeSerializer(serializers.ModelSerializer):
    capacity = serializers.IntegerField(read_only=True)

    class Meta:
        model = LayoutType
        fields = ["id", "name", "shape", "rows", "cols", "seat_count",
                  "seat_numbering_format", "capacity"]

    def validate(self, data):
        shape = data.get("shape", getattr(self.instance, "shape", None))
        if shape == LayoutType.Shape.GRID:
            if not data.get("rows") or not data.get("cols"):
                raise serializers.ValidationError("Grid layout requires rows and cols.")
        elif shape == LayoutType.Shape.CIRCULAR:
            if not data.get("seat_count"):
                raise serializers.ValidationError("Circular layout requires seat_count.")
        return data


class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ["id", "label", "row", "col", "index"]


class ClassroomSerializer(serializers.ModelSerializer):
    layout_type_detail = LayoutTypeSerializer(source="layout_type", read_only=True)
    capacity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Classroom
        fields = ["id", "name", "layout_type", "layout_type_detail", "capacity"]
