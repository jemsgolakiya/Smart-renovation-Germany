"""
Gemini AI Service for Google's Gemini AI integration.

This service provides a configured Gemini AI client that can be used
for various AI-powered features in the application.
"""

import os
import logging
from typing import Optional

import google.generativeai
from google import generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)


class GeminiService:
	"""Service for interacting with Google's Gemini AI."""

	def __init__(self, api_key: Optional[str] = None):
		"""
		Initialize the Gemini service with API key.
		
		Args:
			api_key: Google API key. If not provided, will try to get from
					environment variable GOOGLE_API_KEY or Django settings.
		"""
		self.api_key = api_key or os.getenv("GOOGLE_API_KEY") or getattr(settings, "GOOGLE_API_KEY", None)
		
		if not self.api_key:
			raise ValueError(
				"Google API key not found. Please set GOOGLE_API_KEY environment variable "
				"or GOOGLE_API_KEY in Django settings."
			)
		
		genai.configure(api_key=self.api_key)
		self.model_name = self._select_available_model()
		self.model = genai.GenerativeModel(self.model_name)
		logger.info(f"Initialized Gemini service with model: {self.model_name}")

	def _select_available_model(self) -> str:
		"""
		List available models and select one that supports generateContent.
		
		Returns:
			Model name string (without 'models/' prefix)
		"""
		try:
			# List all available models
			models = list(genai.list_models())
			
			if not models:
				logger.warning("No models returned from API, falling back to default")
				return "gemini-1.5-pro"
			
			# Preferred model names in order of preference (without 'models/' prefix)
			preferred_models = [
				"gemini-1.5-pro",
				"gemini-1.5-flash",
				"gemini-pro",
				"gemini-1.0-pro",
			]
			
			# Create a mapping of short names to full model objects
			model_map = {}
			for model in models:
				# Extract short name from full path (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
				full_name = model.name
				short_name = full_name.split("/")[-1] if "/" in full_name else full_name
				model_map[short_name] = model
			
			# Check each preferred model
			for preferred in preferred_models:
				if preferred in model_map:
					model = model_map[preferred]
					# Check if generateContent is supported
					if hasattr(model, "supported_generation_methods"):
						if "generateContent" in model.supported_generation_methods:
							logger.info(f"Selected model: {preferred} (supports generateContent)")
							return preferred
					else:
						# If supported_generation_methods not available, try the model anyway
						logger.info(f"Selected model: {preferred} (assuming generateContent support)")
						return preferred
			
			# If no preferred model found, try to find any model that supports generateContent
			for short_name, model in model_map.items():
				if "gemini" in short_name.lower():
					if hasattr(model, "supported_generation_methods"):
						if "generateContent" in model.supported_generation_methods:
							logger.info(f"Selected available model: {short_name} (supports generateContent)")
							return short_name
					else:
						# Fallback: use first gemini model found
						logger.warning(f"Using model {short_name} (could not verify generateContent support)")
						return short_name
			
			# If no suitable model found, log available models and raise error
			available = ", ".join(model_map.keys())
			logger.error(f"Available models: {available}")
			raise ValueError(
				f"No suitable Gemini model found that supports generateContent. "
				f"Available models: {available}. Please check your API key and model availability."
			)
			
		except Exception as e:
			logger.error(f"Error listing models: {str(e)}", exc_info=True)
			# Fallback to a common model name
			logger.warning("Falling back to 'gemini-1.5-pro' model name")
			return "gemini-1.5-pro"

# Singleton instance (lazy initialization)
_gemini_service: Optional[GeminiService] = None

def get_gemini_service() -> GeminiService:
	"""Get or create the singleton Gemini service instance."""
	global _gemini_service
	if _gemini_service is None:
		_gemini_service = GeminiService()
	return _gemini_service

