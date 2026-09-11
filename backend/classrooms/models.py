from django.db import models


class LayoutType(models.Model):
    """
    Defines a reusable room layout template.
    shape='grid'     → rows × cols grid, adjacency is 8-directional
    shape='circular' → ring of seat_count seats, adjacency is left/right only
    """

    class Shape(models.TextChoices):
        GRID = "grid", "Grid"
        CIRCULAR = "circular", "Circular"

    name = models.CharField(max_length=100, unique=True)
    shape = models.CharField(max_length=10, choices=Shape.choices)
    rows = models.PositiveSmallIntegerField(null=True, blank=True)   # grid only
    cols = models.PositiveSmallIntegerField(null=True, blank=True)   # grid only
    seat_count = models.PositiveSmallIntegerField(null=True, blank=True)  # circular only
    seat_numbering_format = models.CharField(
        max_length=20,
        default="A1",
        help_text="'A1' for row-letter+col-number, 'R1C1' for row-col numeric",
    )

    def __str__(self):
        return self.name

    @property
    def capacity(self):
        if self.shape == self.Shape.GRID:
            return (self.rows or 0) * (self.cols or 0)
        return self.seat_count or 0


class Seat(models.Model):
    """
    One physical seat in a LayoutType. Created automatically when a
    LayoutType is saved via the precompute utility.
    """
    layout_type = models.ForeignKey(LayoutType, on_delete=models.CASCADE, related_name="seats")
    label = models.CharField(max_length=10)      # e.g. "A1", "R2C3", "S12"
    row = models.PositiveSmallIntegerField(null=True, blank=True)
    col = models.PositiveSmallIntegerField(null=True, blank=True)
    index = models.PositiveSmallIntegerField(null=True, blank=True)  # circular position

    class Meta:
        unique_together = [("layout_type", "label")]
        ordering = ["row", "col", "index"]

    def __str__(self):
        return f"{self.layout_type.name} – {self.label}"


class SeatAdjacency(models.Model):
    """
    Precomputed adjacency pairs per layout type.
    One row per directed pair (A→B and B→A both stored for easy lookup).
    """
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE, related_name="adjacencies")
    adjacent_seat = models.ForeignKey(Seat, on_delete=models.CASCADE, related_name="+")

    class Meta:
        unique_together = [("seat", "adjacent_seat")]

    def __str__(self):
        return f"{self.seat} ↔ {self.adjacent_seat}"


class Classroom(models.Model):
    """A physical classroom in the institution."""
    name = models.CharField(max_length=100, unique=True)
    layout_type = models.ForeignKey(LayoutType, on_delete=models.PROTECT, related_name="classrooms")

    @property
    def capacity(self):
        return self.layout_type.capacity

    def __str__(self):
        return self.name
