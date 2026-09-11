"""
Seating generation algorithm.

Greedy + bounded-backtrack approach:
1. Sort courses by student count descending (hardest first).
2. For each classroom, fill seats round-robin across the courses assigned
   to that slot, checking 8-directional (grid) or left/right (circular)
   adjacency constraints before placing.
3. On constraint violation, try the next available seat (bounded window).
4. Students that can't be placed are flagged as conflicts — the whole run
   never fails silently.

Invigilator assignment runs as a second pass (see invigilation_engine.py).
"""
from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable

from classrooms.models import Classroom, Seat, SeatAdjacency
from exams.models import Slot
from seating.models import SeatingPlan, SeatAssignment
from students.models import Student

logger = logging.getLogger(__name__)

# Maximum number of seats to try per student before flagging as conflict
BACKTRACK_WINDOW = 20


@dataclass
class PlacementResult:
    assignments: list[SeatAssignment] = field(default_factory=list)
    conflicts: list[Student] = field(default_factory=list)
    total_placed: int = 0
    total_students: int = 0


def _preload_adjacency(classroom: Classroom) -> dict[int, set[int]]:
    """
    Returns {seat_id: {adjacent_seat_id, ...}} for a classroom's layout type.
    Loaded once per classroom, not per student.
    """
    adj: dict[int, set[int]] = defaultdict(set)
    pairs = SeatAdjacency.objects.filter(
        seat__layout_type=classroom.layout_type
    ).values_list("seat_id", "adjacent_seat_id")
    for seat_id, adj_id in pairs:
        adj[seat_id].add(adj_id)
    return dict(adj)


def generate_seating(
    plan: SeatingPlan,
    classrooms: list[Classroom],
    progress_callback: Callable[[int, int, str], None] | None = None,
) -> PlacementResult:
    """
    Main entry point. Populates SeatAssignment rows for the given SeatingPlan.

    progress_callback(placed, total, label) — called after each student is processed.
    """
    slot: Slot = plan.slot
    # Courses assigned to this slot
    slot_courses = list(slot.slot_courses.select_related("course").all())
    course_ids = [sc.course_id for sc in slot_courses]

    # Load all students for this session + these courses, grouped by course
    students_by_course: dict[int, list[Student]] = defaultdict(list)
    all_students = list(
        Student.objects.filter(
            exam_session=plan.exam_session,
            course_id__in=course_ids,
        ).select_related("course").order_by("roll_number")
    )
    for s in all_students:
        students_by_course[s.course_id].append(s)

    # Sort courses by student count descending — place hardest first
    sorted_courses = sorted(course_ids, key=lambda cid: len(students_by_course[cid]), reverse=True)

    total_students = len(all_students)
    result = PlacementResult(total_students=total_students)

    # Build a flat pool of students in interleaved (round-robin) order across courses.
    # This ensures no classroom ends up wall-to-wall with one course.
    interleaved: list[Student] = []
    iterators = [iter(students_by_course[cid]) for cid in sorted_courses]
    exhausted = [False] * len(iterators)
    while not all(exhausted):
        for i, it in enumerate(iterators):
            if exhausted[i]:
                continue
            try:
                interleaved.append(next(it))
            except StopIteration:
                exhausted[i] = True

    # Distribute interleaved students evenly across classrooms
    classroom_seats: dict[int, list[Seat]] = {}
    classroom_adj: dict[int, dict[int, set[int]]] = {}
    for cls in classrooms:
        seats = list(cls.layout_type.seats.all().order_by("row", "col", "index"))
        classroom_seats[cls.pk] = seats
        classroom_adj[cls.pk] = _preload_adjacency(cls)

    # Assign students to classrooms by simple even distribution
    total_capacity = sum(len(classroom_seats[c.pk]) for c in classrooms)
    assignments_to_create: list[SeatAssignment] = []

    placed = 0
    student_pool = list(interleaved)
    student_idx = 0

    for cls in classrooms:
        seats = classroom_seats[cls.pk]
        adj = classroom_adj[cls.pk]
        # seat_id → course_id for placed students in this classroom
        placed_courses: dict[int, int] = {}

        for seat in seats:
            if student_idx >= len(student_pool):
                break

            # Try to place the next student; if adjacency fails, slide the
            # window forward up to BACKTRACK_WINDOW positions.
            placed_here = False
            search_start = student_idx
            search_end = min(student_idx + BACKTRACK_WINDOW, len(student_pool))

            for candidate_idx in range(search_start, search_end):
                candidate = student_pool[candidate_idx]
                course_id = candidate.course_id

                # Check adjacency: no neighbour seat has the same course
                neighbours = adj.get(seat.pk, set())
                conflict = any(
                    placed_courses.get(n_id) == course_id for n_id in neighbours
                )
                if not conflict:
                    # Place this student here
                    placed_courses[seat.pk] = course_id
                    assignments_to_create.append(
                        SeatAssignment(
                            seating_plan=plan,
                            classroom=cls,
                            seat=seat,
                            student=candidate,
                            is_conflict=False,
                        )
                    )
                    # Remove from pool (swap with search_start for O(1) removal)
                    student_pool[candidate_idx] = student_pool[student_idx]
                    student_idx += 1
                    placed += 1
                    placed_here = True

                    if progress_callback:
                        progress_callback(placed, total_students, f"Placing students in {cls.name}…")
                    break

            if not placed_here:
                # Couldn't satisfy constraint within window — leave seat empty,
                # student stays in pool but will eventually be marked conflict
                pass

    # Any students left unplaced after all classrooms are processed → conflicts
    unplaced = student_pool[student_idx:]
    for s in unplaced:
        result.conflicts.append(s)
        assignments_to_create.append(
            SeatAssignment(
                seating_plan=plan,
                classroom=classrooms[0] if classrooms else None,  # placeholder classroom
                seat=None,  # type: ignore[arg-type]
                student=s,
                is_conflict=True,
            )
        )

    # Bulk create all assignments (conflict ones excluded from bulk — created individually)
    normal = [a for a in assignments_to_create if not a.is_conflict]
    conflict_ones = [a for a in assignments_to_create if a.is_conflict]

    SeatAssignment.objects.bulk_create(normal, batch_size=500)
    # Conflict rows need special handling (seat may be None)
    for ca in conflict_ones:
        if classrooms:
            # Find first empty seat in first classroom for a placeholder
            first_cls = classrooms[0]
            used_seats = set(
                SeatAssignment.objects.filter(
                    seating_plan=plan, classroom=first_cls
                ).values_list("seat_id", flat=True)
            )
            available = [s for s in classroom_seats[first_cls.pk] if s.pk not in used_seats]
            if available:
                ca.seat = available[0]
                ca.classroom = first_cls
                ca.save()

    result.assignments = normal
    result.total_placed = placed

    logger.info(
        "Seating generation complete: %d placed, %d conflicts",
        placed,
        len(result.conflicts),
    )
    return result
