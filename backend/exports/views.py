"""
PDF export views using WeasyPrint.
Generates per-classroom seating chart PDFs and bulk zip exports.
"""
from __future__ import annotations

import io
import zipfile

from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from seating.models import SeatingPlan, SeatAssignment
from classrooms.models import Classroom


def _render_pdf(html: str) -> bytes:
    from weasyprint import HTML
    return HTML(string=html).write_pdf()


@api_view(["GET"])
def classroom_pdf(request, plan_id: int, classroom_id: int):
    """Single classroom seating chart as PDF."""
    try:
        plan = SeatingPlan.objects.select_related("exam_session", "slot").get(pk=plan_id)
        classroom = Classroom.objects.select_related("layout_type").get(pk=classroom_id)
    except (SeatingPlan.DoesNotExist, Classroom.DoesNotExist):
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    assignments = (
        SeatAssignment.objects.filter(seating_plan=plan, classroom=classroom)
        .select_related("student__course", "seat")
        .order_by("seat__row", "seat__col", "seat__index")
    )

    html = render_to_string("exports/seating_chart.html", {
        "plan": plan,
        "classroom": classroom,
        "assignments": assignments,
        "layout": classroom.layout_type,
    })
    pdf_bytes = _render_pdf(html)

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="seating_{classroom.name}_{plan.slot.label}_v{plan.version}.pdf"'
    )
    return response


@api_view(["GET"])
def bulk_zip_export(request, plan_id: int):
    """All classroom PDFs for a seating plan as a single zip download."""
    try:
        plan = SeatingPlan.objects.select_related("exam_session", "slot").get(pk=plan_id)
    except SeatingPlan.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    classroom_ids = (
        SeatAssignment.objects.filter(seating_plan=plan)
        .values_list("classroom_id", flat=True)
        .distinct()
    )
    classrooms = Classroom.objects.filter(pk__in=classroom_ids).select_related("layout_type")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for classroom in classrooms:
            assignments = (
                SeatAssignment.objects.filter(seating_plan=plan, classroom=classroom)
                .select_related("student__course", "seat")
                .order_by("seat__row", "seat__col", "seat__index")
            )
            html = render_to_string("exports/seating_chart.html", {
                "plan": plan,
                "classroom": classroom,
                "assignments": assignments,
                "layout": classroom.layout_type,
            })
            pdf_bytes = _render_pdf(html)
            filename = f"seating_{classroom.name}.pdf".replace(" ", "_")
            zf.writestr(filename, pdf_bytes)

    zip_buffer.seek(0)
    response = HttpResponse(zip_buffer.read(), content_type="application/zip")
    session_name = plan.exam_session.name.replace(" ", "_")
    response["Content-Disposition"] = (
        f'attachment; filename="{session_name}_{plan.slot.label}_v{plan.version}_seating.zip"'
    )
    return response
