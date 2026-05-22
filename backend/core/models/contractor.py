from django.db import models
from django.utils import timezone


class Contractor(models.Model):
	# Basic Information
	name = models.CharField("Contractor Name", max_length=200)
	address = models.CharField("Address", max_length=300, blank=True)
	city = models.CharField("City", max_length=100, blank=True)
	postal_code = models.CharField("Postal Code", max_length=20, blank=True)
	state = models.CharField("State", max_length=100, blank=True)
	phone = models.CharField("Phone", max_length=20, blank=True)
	website = models.URLField("Website", blank=True)
	email = models.EmailField("Email", blank=True)
	
	# Google Places Integration
	place_id = models.CharField(
		"Google Place ID",
		max_length=255,
		blank=True,
		null=True,
		unique=True,
		db_index=True,
		help_text="Unique identifier from Google Places API"
	)
	latitude = models.DecimalField(
		"Latitude",
		max_digits=10,
		decimal_places=7,
		null=True,
		blank=True
	)
	longitude = models.DecimalField(
		"Longitude",
		max_digits=10,
		decimal_places=7,
		null=True,
		blank=True
	)
	last_updated = models.DateTimeField(
		"Last Updated",
		auto_now=True,
		help_text="Last time this contractor data was updated"
	)

	# Business Information
	price_range = models.CharField("Price Range", max_length=50, blank=True)
	service_area = models.CharField("Service Area", max_length=200, blank=True)
	business_size = models.CharField("Business Size", max_length=50, blank=True)
	years_in_business = models.IntegerField("Years in Business", null=True, blank=True)

	# Services and Description
	services = models.TextField("Services", blank=True)
	description = models.TextField("Description", blank=True)
	specializations = models.TextField("Specializations", blank=True)

	# Quality Metrics
	rating = models.DecimalField(
		"Rating",
		max_digits=3,
		decimal_places=2,
		null=True,
		blank=True,
		help_text="Rating out of 5.0",
	)
	reviews_count = models.IntegerField("Reviews Count", default=0)

	# Additional Information
	certifications = models.TextField("Certifications", blank=True)
	kfw_eligible = models.BooleanField("KfW Eligible", default=False)
	source = models.CharField("Source", max_length=100, blank=True)
	additional_info = models.TextField("Additional Info", blank=True)

	# Project Types - stored as comma-separated values
	# This allows contractors to handle multiple project types
	project_types = models.CharField(
		"Project Types",
		max_length=500,
		blank=True,
		help_text="Comma-separated list of project types (e.g., 'kitchen,bathroom,plumbing')",
	)
	
	# Certification Signals (from AI enrichment)
	certification_signals = models.JSONField(
		"Certification Signals",
		null=True,
		blank=True,
		help_text="AI-enriched certification data (HWK, Meisterbetrieb, KfW, etc.)"
	)
	
	# AI-Generated Description
	ai_description = models.CharField(
		"AI Description",
		max_length=200,
		blank=True,
		help_text="Short AI-generated description of contractor services"
	)

	class Meta:
		ordering = ["-rating", "name"]
		verbose_name = "Contractor"
		verbose_name_plural = "Contractors"

	def __str__(self) -> str:
		return self.name

