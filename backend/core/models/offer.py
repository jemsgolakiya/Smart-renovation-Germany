from django.db import models
from django.contrib.auth.models import User
from core.models.contractor import Contractor
from core.models.project import Project


class Offer(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("submitted", "Submitted"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ]

    contractor = models.ForeignKey(Contractor, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    offer_letter = models.FileField(upload_to="offers/")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Offer from {self.contractor} for {self.project}"
