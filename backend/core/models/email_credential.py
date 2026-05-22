from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


class EmailCredential(models.Model):
	"""
	Store email OAuth credentials separately from User model.
	This allows for multiple email accounts per user in the future.
	"""
	PROVIDER_CHOICES = [
		('gmail', 'Gmail'),
		('outlook', 'Outlook'),
	]
	
	user = models.OneToOneField(
		User,
		on_delete=models.CASCADE,
		related_name='email_credential'
	)
	provider = models.CharField(
		"Email Provider",
		max_length=20,
		choices=PROVIDER_CHOICES,
		default='gmail',
		help_text="Email service provider"
	)
	access_token = models.TextField(
		"Access Token",
		blank=True,
		null=True,
		help_text="OAuth access token"
	)
	refresh_token = models.TextField(
		"Refresh Token",
		blank=True,
		null=True,
		help_text="OAuth refresh token"
	)
	token_expiry = models.DateTimeField(
		"Token Expiry",
		blank=True,
		null=True,
		help_text="Expiry datetime of the access token"
	)
	email_address = models.EmailField(
		"Email Address",
		blank=True,
		null=True,
		help_text="Email address associated with OAuth"
	)
	scopes = models.JSONField(
		"OAuth Scopes",
		blank=True,
		null=True,
		help_text="Granted OAuth scopes"
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	
	class Meta:
		verbose_name = "Email Credential"
		verbose_name_plural = "Email Credentials"
	
	def __str__(self):
		return f"{self.user.username} - {self.provider}"
	
	def is_valid(self) -> bool:
		"""
		Check if credentials are valid and not expired.
		
		Returns:
			True if access token exists and hasn't expired
		"""
		if not self.access_token:
			return False
		
		if not self.token_expiry:
			return False
		
		# Check if token is still valid (with 5 minute buffer)
		return self.token_expiry > timezone.now() + timedelta(minutes=5)

