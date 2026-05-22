from django.db import models
from django.contrib.auth.models import User
from .project import Project

class PlanStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    GENERATED = "generated", "Generated"
    APPROVED = "approved", "Approved"
    ARCHIVED = "archived", "Archived"

class RenovationPlan(models.Model):
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='renovation_plans'
    )
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name='renovation_plans',
        null=True,
        blank=True
    )
    plan_name = models.CharField(max_length=200, default="Untitled Plan")
    plan_data = models.JSONField(default=dict, blank=True)
    input_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20,
        choices=PlanStatus.choices,
        default=PlanStatus.GENERATED
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.plan_name