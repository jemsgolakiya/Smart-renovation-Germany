from django.db import models
from django.utils import timezone
import json


class FinancingResult(models.Model):
    """
    Model to store financing analysis results for users.
    Allows users to save and retrieve their financing calculations.
    """

    # Basic Information
    renovation_type = models.CharField(max_length=100, help_text="Type of renovation (bathroom, kitchen, etc.)")
    property_location = models.CharField(max_length=200, blank=True, null=True, help_text="Property location")

    # Form Data (store the complete form submission)
    form_data = models.JSONField(help_text="Complete form data submitted by user")

    # Cost Estimate Results
    total_estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total estimated cost in EUR")
    cost_breakdown = models.JSONField(help_text="Detailed cost breakdown")
    cost_explanation = models.TextField(blank=True, null=True, help_text="AI explanation of costs")

    # Financing Options (optional - filled when user clicks "Get Financing Options")
    financing_options = models.JSONField(blank=True, null=True, help_text="Recommended financing options")
    financing_summary = models.TextField(blank=True, null=True, help_text="Summary of financing recommendations")

    # Generated Image (optional - filled when user generates visualization)
    image_base64 = models.TextField(blank=True, null=True, help_text="Base64 encoded generated image")
    image_prompt = models.TextField(blank=True, null=True, help_text="Prompt used for image generation")

    # RAG Metadata
    rag_enabled = models.BooleanField(default=False, help_text="Whether RAG was used for analysis")
    rag_metadata = models.JSONField(blank=True, null=True, help_text="RAG analysis metadata")

    # User Information (optional - for future authentication)
    user_identifier = models.CharField(max_length=255, blank=True, null=True, help_text="User identifier (email, session ID, etc.)")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, help_text="When result was saved")
    updated_at = models.DateTimeField(auto_now=True, help_text="When result was last updated")
    result_name = models.CharField(max_length=255, blank=True, null=True, help_text="User-given name for this result")
    notes = models.TextField(blank=True, null=True, help_text="User notes about this result")

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Financing Result'
        verbose_name_plural = 'Financing Results'
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['renovation_type']),
            models.Index(fields=['user_identifier']),
        ]

    def __str__(self):
        name = self.result_name or f"{self.renovation_type} renovation"
        return f"{name} - €{self.total_estimated_cost:,} ({self.created_at.strftime('%Y-%m-%d')})"

    def get_summary(self):
        """Generate a brief summary of this result"""
        return {
            'id': self.id,
            'renovation_type': self.renovation_type,
            'total_cost': float(self.total_estimated_cost),
            'result_name': self.result_name or f"{self.renovation_type.title()} Renovation",
            'created_at': self.created_at.isoformat(),
            'has_financing_options': bool(self.financing_options),
            'has_image': bool(self.image_base64),
            'rag_enabled': self.rag_enabled,
        }

    def get_full_data(self):
        """Get complete result data for display"""
        return {
            'id': self.id,
            'renovation_type': self.renovation_type,
            'property_location': self.property_location,
            'result_name': self.result_name,
            'notes': self.notes,
            'form_data': self.form_data,
            'cost_estimate': {
                'totalEstimatedCost': float(self.total_estimated_cost),
                'breakdown': self.cost_breakdown,
                'explanation': self.cost_explanation,
            },
            'financing_options': self.financing_options,
            'financing_summary': self.financing_summary,
            'image_description': {
                'image_base64': self.image_base64,
                'imagePrompt': self.image_prompt,
            } if self.image_base64 else None,
            'rag_metadata': {
                'rag_enabled': self.rag_enabled,
                **({} if not self.rag_metadata else self.rag_metadata)
            },
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
