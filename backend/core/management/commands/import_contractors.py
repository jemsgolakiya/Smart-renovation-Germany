import csv
import os
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand
from core.models import Contractor


class Command(BaseCommand):
	help = "Import contractors from contractors.csv file into the database"

	def add_arguments(self, parser):
		parser.add_argument(
			"--file",
			type=str,
			default="contractors.csv",
			help="Path to the CSV file (relative to backend directory)",
		)
		parser.add_argument(
			"--skip-existing",
			action="store_true",
			help="Skip existing contractors instead of updating them",
		)

	def handle(self, *args, **options):
		file_path = options["file"]
		skip_existing = options["skip_existing"]

		# Get the backend directory path
		backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
		csv_path = os.path.join(backend_dir, file_path)

		if not os.path.exists(csv_path):
			self.stdout.write(
				self.style.ERROR(f"CSV file not found: {csv_path}")
			)
			return

		self.stdout.write(f"Reading CSV file: {csv_path}")

		created_count = 0
		updated_count = 0
		error_count = 0
		errors = []

		try:
			with open(csv_path, "r", encoding="utf-8") as csvfile:
				reader = csv.DictReader(csvfile)
				
				for row_num, row in enumerate(reader, start=2):  # Start at 2 (row 1 is header)
					try:
						contractor_data = self._parse_row(row)
						
						# Validate required field: name
						if not contractor_data.get("name"):
							raise ValueError("Name field is required and cannot be empty")
						
						# Check if contractor already exists by name
						contractor, created = Contractor.objects.get_or_create(
							name=contractor_data["name"],
							defaults=contractor_data
						)
						
						if not created:
							# Contractor exists
							if skip_existing:
								# Skip existing contractor
								self.stdout.write(
									self.style.WARNING(
										f"Row {row_num}: Contractor '{contractor_data['name']}' already exists. Skipping."
									)
								)
							else:
								# Update existing contractor
								for key, value in contractor_data.items():
									setattr(contractor, key, value)
								contractor.save()
								updated_count += 1
						else:
							# New contractor created
							created_count += 1
							
					except Exception as e:
						error_count += 1
						error_msg = f"Row {row_num}: {str(e)}"
						errors.append(error_msg)
						self.stdout.write(
							self.style.ERROR(error_msg)
						)
						continue

		except Exception as e:
			self.stdout.write(
				self.style.ERROR(f"Error reading CSV file: {str(e)}")
			)
			return

		# Print summary
		self.stdout.write(self.style.SUCCESS("\n" + "=" * 50))
		self.stdout.write(self.style.SUCCESS("Import Summary"))
		self.stdout.write(self.style.SUCCESS("=" * 50))
		self.stdout.write(f"Created: {created_count}")
		self.stdout.write(f"Updated: {updated_count}")
		self.stdout.write(f"Errors: {error_count}")
		
		if errors:
			self.stdout.write(self.style.WARNING("\nErrors encountered:"))
			for error in errors:
				self.stdout.write(self.style.WARNING(f"  - {error}"))

	def _parse_row(self, row):
		"""Parse a CSV row and convert it to a dictionary suitable for Contractor model."""
		data = {}

		# Direct string mappings
		string_fields = [
			"name", "address", "city", "postal_code", "state", "phone",
			"website", "email", "price_range", "service_area", "business_size",
			"services", "description", "specializations", "certifications",
			"source", "additional_info", "project_types"
		]
		
		for field in string_fields:
			value = row.get(field, "").strip()
			# For website and email, use None for empty strings (Django best practice)
			if field in ("website", "email") and not value:
				data[field] = None
			else:
				data[field] = value if value else ""

		# Type conversions
		# years_in_business: convert to int
		years_str = row.get("years_in_business", "").strip()
		if years_str:
			try:
				data["years_in_business"] = int(years_str)
			except ValueError:
				data["years_in_business"] = None
		else:
			data["years_in_business"] = None

		# rating: convert to Decimal
		rating_str = row.get("rating", "").strip()
		if rating_str:
			try:
				data["rating"] = Decimal(rating_str)
			except (ValueError, InvalidOperation):
				data["rating"] = None
		else:
			data["rating"] = None

		# reviews_count: convert to int (default 0)
		reviews_str = row.get("reviews_count", "").strip()
		if reviews_str:
			try:
				data["reviews_count"] = int(reviews_str)
			except ValueError:
				data["reviews_count"] = 0
		else:
			data["reviews_count"] = 0

		# kfw_eligible: convert to boolean
		kfw_str = row.get("kfw_eligible", "").strip().lower()
		if kfw_str in ("true", "1", "yes", "ja"):
			data["kfw_eligible"] = True
		else:
			data["kfw_eligible"] = False

		return data

