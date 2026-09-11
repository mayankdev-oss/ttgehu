"""
Adjacency precompute utility.

Call `precompute_adjacency(layout_type)` after creating/updating a LayoutType
to populate Seat and SeatAdjacency rows.

Grid (8-directional): every seat is adjacent to up to 8 neighbours
(up, down, left, right, and four diagonals).

Circular (left/right only): seat at index i is adjacent to (i-1) and (i+1),
wrapping around.
"""
from .models import LayoutType, Seat, SeatAdjacency


def _grid_label(row: int, col: int, fmt: str) -> str:
    if fmt == "R1C1":
        return f"R{row}C{col}"
    # Default: A1 format (row as letter, col as number)
    letter = chr(ord("A") + row - 1)
    return f"{letter}{col}"


def precompute_adjacency(layout_type: LayoutType) -> None:
    """
    Drop all existing Seat + SeatAdjacency rows for this layout_type,
    then recreate them based on current shape/dimensions.
    """
    # Clean up existing data
    SeatAdjacency.objects.filter(seat__layout_type=layout_type).delete()
    Seat.objects.filter(layout_type=layout_type).delete()

    seats: dict[tuple, Seat] = {}  # key → Seat instance

    if layout_type.shape == LayoutType.Shape.GRID:
        rows = layout_type.rows or 0
        cols = layout_type.cols or 0
        fmt = layout_type.seat_numbering_format

        for r in range(1, rows + 1):
            for c in range(1, cols + 1):
                seat = Seat.objects.create(
                    layout_type=layout_type,
                    label=_grid_label(r, c, fmt),
                    row=r,
                    col=c,
                )
                seats[(r, c)] = seat

        # 8-directional adjacency
        adjacencies = []
        for (r, c), seat in seats.items():
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    neighbour = seats.get((r + dr, c + dc))
                    if neighbour:
                        adjacencies.append(SeatAdjacency(seat=seat, adjacent_seat=neighbour))

        SeatAdjacency.objects.bulk_create(adjacencies, ignore_conflicts=True)

    elif layout_type.shape == LayoutType.Shape.CIRCULAR:
        n = layout_type.seat_count or 0
        for i in range(1, n + 1):
            seat = Seat.objects.create(
                layout_type=layout_type,
                label=f"S{i}",
                index=i,
            )
            seats[i] = seat

        # Left/right adjacency only (ring wrap-around)
        adjacencies = []
        for i, seat in seats.items():
            left_idx = (i - 2) % n + 1   # i-1 with wrap
            right_idx = i % n + 1          # i+1 with wrap
            adjacencies.append(SeatAdjacency(seat=seat, adjacent_seat=seats[left_idx]))
            adjacencies.append(SeatAdjacency(seat=seat, adjacent_seat=seats[right_idx]))

        SeatAdjacency.objects.bulk_create(adjacencies, ignore_conflicts=True)
