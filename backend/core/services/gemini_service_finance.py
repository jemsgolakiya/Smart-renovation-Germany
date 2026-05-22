"""
Gemini AI Service
Handles communication with Google's Gemini API for AI-powered cost estimation and recommendations
"""

import json
import requests
import time
from typing import Dict, List, Any


class GeminiService:
	"""
	Service class for interacting with Google Gemini AI API
	"""

	def __init__(self, api_key: str):
		"""
		Initialize Gemini service with API key

		Args:
			api_key (str): Google Gemini API key
		"""
		self.api_key = api_key
		self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
		self.model = "gemini-2.5-flash-lite"
		self.generation_config = {
			"temperature": 0.7,
			"maxOutputTokens": 2048,  # Increased from 800 to allow full JSON response
			"topP": 0.95,
			"topK": 40
		}

	def generate_cost_estimate(self, prompt: str, max_retries: int = 3) -> Dict[str, Any]:
		"""
		Generate cost estimate using Gemini AI with retry logic

		Args:
			prompt (str): The formatted prompt for cost estimation
			max_retries (int): Maximum number of retry attempts (default: 3)

		Returns:
			dict: Cost estimate with breakdown

		Raises:
			Exception: If API call fails after all retries or response is invalid
		"""
		last_error = None

		for attempt in range(max_retries):
			try:
				if attempt > 0:
					# Exponential backoff: 2^attempt seconds (2s, 4s, 8s)
					wait_time = 2 ** attempt
					print(f"\n   [RETRY {attempt}/{max_retries}] Waiting {wait_time}s before retry...")
					time.sleep(wait_time)

				# Call Gemini API - THIS IS A REAL API CALL!
				print(f"   >> Attempt {attempt + 1}/{max_retries}: Calling Gemini API...")
				response_text = self._call_gemini_api(prompt)

				print("   >> Raw AI response received:")
				print("   " + "-" * 76)
				preview = response_text[:300] + "..." if len(response_text) > 300 else response_text
				for line in preview.split('\n'):
					print(f"   {line}")
				print("   " + "-" * 76)

				# Clean and parse JSON response
				cleaned_json = self._clean_json_response(response_text)
				cost_estimate = json.loads(cleaned_json)

				# Validate response structure
				if not self._validate_cost_estimate(cost_estimate):
					raise ValueError("Invalid cost estimate structure received from AI")

				print("   [SUCCESS] Successfully parsed REAL AI response (NOT FALLBACK)\n")
				return cost_estimate

			except json.JSONDecodeError as e:
				last_error = f"JSON parsing failed: {str(e)}"
				print(f"\n   [JSON PARSE ERROR - Attempt {attempt + 1}/{max_retries}]")
				print(f"   Error: {e}")
				import traceback
				traceback.print_exc()

				if attempt == max_retries - 1:
					print(f"\n   [CRITICAL] All {max_retries} attempts failed!")
					raise Exception(f"Failed to parse AI response after {max_retries} attempts: {last_error}")

			except Exception as e:
				last_error = str(e)
				print(f"\n   [EXCEPTION - Attempt {attempt + 1}/{max_retries}]")
				print(f"   Error type: {type(e).__name__}")
				print(f"   Error message: {str(e)}")
				import traceback
				traceback.print_exc()

				# Check if it's a rate limit error (429) - don't retry immediately
				if "429" in str(e):
					if attempt < max_retries - 1:
						wait_time = 10 * (attempt + 1)  # Wait longer for rate limits (10s, 20s, 30s)
						print(f"   [RATE LIMIT] Waiting {wait_time}s before retry...")
						time.sleep(wait_time - (2 ** attempt))  # Subtract already-planned wait
					else:
						print(f"\n   [CRITICAL] Rate limit exceeded after {max_retries} attempts!")
						raise Exception(f"RATE_LIMIT_ERROR: Your Gemini API key has exceeded its quota. Please check Google AI Studio for quota limits and consider upgrading your plan.")

				if attempt == max_retries - 1:
					print(f"\n   [CRITICAL] All {max_retries} attempts failed!")
					raise Exception(f"Gemini API failed after {max_retries} attempts: {last_error}")

		# Should never reach here
		raise Exception(f"Unexpected error in cost estimation: {last_error}")

	def generate_financing_options(self, prompt: str, max_retries: int = 3) -> Dict[str, Any]:
		"""
		Generate financing options using Gemini AI with retry logic

		Args:
			prompt (str): The formatted prompt for financing options
			max_retries (int): Maximum number of retry attempts (default: 3)

		Returns:
			dict: Financing options with recommendations

		Raises:
			Exception: If API call fails after all retries or response is invalid
		"""
		last_error = None

		for attempt in range(max_retries):
			try:
				if attempt > 0:
					wait_time = 2 ** attempt
					print(f"\n   [RETRY {attempt}/{max_retries}] Waiting {wait_time}s before retry...")
					time.sleep(wait_time)

				print(f"   >> Attempt {attempt + 1}/{max_retries}: Calling Gemini API...")
				response_text = self._call_gemini_api(prompt)

				print("   >> Raw AI response received:")
				print("   " + "-" * 76)
				preview = response_text[:300] + "..." if len(response_text) > 300 else response_text
				for line in preview.split('\n'):
					print(f"   {line}")
				print("   " + "-" * 76)

				# Clean and parse JSON response
				cleaned_json = self._clean_json_response(response_text)
				financing_options = json.loads(cleaned_json)

				print("   [SUCCESS] Successfully parsed financing options response\n")
				return financing_options

			except json.JSONDecodeError as e:
				last_error = f"JSON parsing failed: {str(e)}"
				print(f"\n   [JSON PARSE ERROR - Attempt {attempt + 1}/{max_retries}]")
				print(f"   Error: {e}")

				if attempt == max_retries - 1:
					print(f"\n   [CRITICAL] All {max_retries} attempts failed!")
					raise Exception(f"Failed to parse AI response after {max_retries} attempts: {last_error}")

			except Exception as e:
				last_error = str(e)
				print(f"\n   [EXCEPTION - Attempt {attempt + 1}/{max_retries}]")
				print(f"   Error type: {type(e).__name__}")
				print(f"   Error message: {str(e)}")

				if "429" in str(e):
					if attempt < max_retries - 1:
						wait_time = 10 * (attempt + 1)
						print(f"   [RATE LIMIT] Waiting {wait_time}s before retry...")
						time.sleep(wait_time - (2 ** attempt))
					else:
						print(f"\n   [CRITICAL] Rate limit exceeded after {max_retries} attempts!")
						raise Exception(f"RATE_LIMIT_ERROR: Your Gemini API key has exceeded its quota. Please check Google AI Studio for quota limits.")

				if attempt == max_retries - 1:
					print(f"\n   [CRITICAL] All {max_retries} attempts failed!")
					raise Exception(f"Gemini API failed after {max_retries} attempts: {last_error}")

		raise Exception(f"Unexpected error in financing options generation: {last_error}")

	def generate_image_description(self, prompt: str, max_retries: int = 3) -> Dict[str, Any]:
		"""
		Generate image description using Gemini AI with gemini-2.5-flash model
		NOTE: This method uses gemini-2.5-flash for better quota availability

		Args:
			prompt (str): The formatted prompt for image description
			max_retries (int): Maximum number of retry attempts (default: 3)

		Returns:
			dict: Image description and details
		"""
		last_error = None

		for attempt in range(max_retries):
			try:
				if attempt > 0:
					wait_time = 2 ** attempt
					print(f"\n   [RETRY {attempt}/{max_retries}] Waiting {wait_time}s before retry...")
					time.sleep(wait_time)

				print(f"   >> Attempt {attempt + 1}/{max_retries}: Calling Gemini API with gemini-2.5-flash model...")
				# Use gemini-2.5-flash for image generation (has available quota)
				response_text = self._call_gemini_api_with_model(prompt, model="gemini-2.5-flash")

				print("   >> Raw AI response received:")
				print("   " + "-" * 76)
				preview = response_text[:300] + "..." if len(response_text) > 300 else response_text
				for line in preview.split('\n'):
					print(f"   {line}")
				print("   " + "-" * 76)

				# Clean and parse JSON response
				cleaned_json = self._clean_json_response(response_text)
				image_description = json.loads(cleaned_json)

				print("   [SUCCESS] Successfully parsed image description response\n")
				return image_description

			except json.JSONDecodeError as e:
				last_error = f"JSON parsing failed: {str(e)}"
				print(f"\n   [JSON PARSE ERROR - Attempt {attempt + 1}/{max_retries}]")
				print(f"   Error: {e}")

				if attempt == max_retries - 1:
					raise Exception(f"Failed to parse AI response after {max_retries} attempts: {last_error}")

			except Exception as e:
				last_error = str(e)
				print(f"\n   [EXCEPTION - Attempt {attempt + 1}/{max_retries}]")
				print(f"   Error: {str(e)}")

				if "429" in str(e) and attempt == max_retries - 1:
					raise Exception(f"RATE_LIMIT_ERROR: Your Gemini API key has exceeded its quota.")

				if attempt == max_retries - 1:
					raise Exception(f"Gemini API failed after {max_retries} attempts: {last_error}")

		raise Exception(f"Unexpected error: {last_error}")

	def _call_gemini_api_with_model(self, prompt: str, model: str = None) -> str:
		"""
		Make API call to Gemini with specific model

		Args:
			prompt (str): The prompt to send
			model (str): Model to use (optional, defaults to self.model)

		Returns:
			str: Raw text response from Gemini

		Raises:
			Exception: If API call fails
		"""
		# Use provided model or default to self.model
		model_to_use = model if model else self.model

		print(f"\n   [API Key check]")
		print(f"      - Length: {len(self.api_key)}")
		print(f"      - First 20 chars: {self.api_key[:20]}")
		print(f"      - Last 4 chars: {self.api_key[-4:]}")

		print(f"\n   [Making POST request to]")
		print(f"      - URL: {self.base_url}/{model_to_use}:generateContent")
		print(f"      - Model: {model_to_use}")

		full_api_url = f"{self.base_url}/{model_to_use}:generateContent?key={self.api_key}"

		payload = {
			"contents": [{"parts": [{"text": prompt}]}],
			"generationConfig": self.generation_config
		}

		print("   [Sending HTTP POST request to Google Gemini API]")

		try:
			response = requests.post(
				full_api_url,
				json=payload,
				headers={"Content-Type": "application/json"},
				timeout=30
			)
		except Exception as e:
			print(f"\n   [NETWORK ERROR]: {e}")
			raise

		print(f"   [SUCCESS] Received HTTP response (Status: {response.status_code})")

		if not response.ok:
			error_msg = f"Gemini API error: {response.status_code}"
			try:
				error_data = response.json()
				print(f"\n   [API ERROR RESPONSE]:")
				print(f"      {error_data}")
				error_msg += f" - {error_data.get('error', {}).get('message', 'Unknown error')}"
			except:
				print(f"\n   [ERROR] Response text: {response.text}")
			raise Exception(error_msg)

		data = response.json()
		print(f"   [Response structure]: {list(data.keys())}")

		# Debug: Print full response for analysis
		import json as json_lib
		print(f"\n   [FULL API RESPONSE]:")
		print(json_lib.dumps(data, indent=2)[:1000])  # First 1000 chars

		# Check if response was blocked by safety filters
		if 'candidates' not in data or len(data['candidates']) == 0:
			raise Exception("No candidates in response - request may have been blocked")

		candidate = data['candidates'][0]

		# Check for blocked content
		if 'content' not in candidate:
			finish_reason = candidate.get('finishReason', 'UNKNOWN')
			safety_ratings = candidate.get('safetyRatings', [])
			raise Exception(f"Response blocked. Finish reason: {finish_reason}. Safety ratings: {safety_ratings}")

		# Handle different response structures
		content = candidate['content']
		if 'parts' not in content:
			raise Exception(f"No 'parts' in response content. Content keys: {list(content.keys())}")

		# Extract text from parts
		parts = content['parts']
		if len(parts) == 0 or 'text' not in parts[0]:
			raise Exception(f"No text in response parts. Parts: {parts}")

		return parts[0]['text']

	def _call_gemini_api(self, prompt: str) -> str:
		"""
		Make API call to Gemini using default model

		Args:
			prompt (str): The prompt to send

		Returns:
			str: Raw text response from Gemini

		Raises:
			Exception: If API call fails
		"""
		# Use the helper method with default model
		return self._call_gemini_api_with_model(prompt, model=self.model)

	def _clean_json_response(self, response: str) -> str:
		"""
		Clean JSON response by removing markdown code blocks and extra text

		Args:
			response (str): Raw response text

		Returns:
			str: Cleaned JSON string
		"""
		# Remove markdown code blocks
		response = response.replace('```json', '').replace('```', '')

		# Strip whitespace
		response = response.strip()

		# Find JSON object/array bounds
		start_obj = response.find('{')
		start_arr = response.find('[')
		end_obj = response.rfind('}')
		end_arr = response.rfind(']')

		# Determine if it's an object or array
		if start_obj != -1 and (start_arr == -1 or start_obj < start_arr):
			# It's an object
			if end_obj != -1:
				response = response[start_obj:end_obj + 1]
		elif start_arr != -1:
			# It's an array
			if end_arr != -1:
				response = response[start_arr:end_arr + 1]

		return response

	def _validate_cost_estimate(self, estimate: Dict) -> bool:
		"""
		Validate cost estimate structure

		Args:
			estimate (dict): Cost estimate to validate

		Returns:
			bool: True if valid
		"""
		required_fields = ['totalEstimatedCost', 'breakdown', 'contingency', 'explanation']
		return all(field in estimate for field in required_fields)