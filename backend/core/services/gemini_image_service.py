"""
AI Image Generation Service - Vertex AI Version
Uses Google Cloud Vertex AI with Imagen 4.0 Ultra for highest quality image generation

Features:
- Imagen 4.0 Ultra (Google's best image generation model)
- Ultra-high quality photorealistic images
- Professional architectural photography quality
- Full control over generation parameters
- Enterprise-grade reliability

Requirements:
- Google Cloud Project with billing enabled
- Vertex AI API enabled
- Service account with Vertex AI User role
- Credentials JSON file
"""

import os
import time
import base64
from typing import Dict, Any
from pathlib import Path

# Vertex AI imports
try:
    from google.cloud import aiplatform
    from vertexai.preview.vision_models import ImageGenerationModel
    VERTEX_AI_AVAILABLE = True
except ImportError:
    VERTEX_AI_AVAILABLE = False

from .vertex_ai_config import VertexAIConfig


class GeminiImageService:
    """
    Service for generating high-quality images using Google Cloud Vertex AI Imagen 4.0 Ultra

    This service uses Google Cloud's Vertex AI platform with enterprise-grade
    image generation capabilities.
    """

    def __init__(self, api_key: str = None):
        """
        Initialize Vertex AI Imagen Service

        Args:
            api_key (str): Not used (Vertex AI uses service account credentials)
        """
        if not VERTEX_AI_AVAILABLE:
            raise ImportError(
                "Google Cloud Vertex AI SDK not installed.\n"
                "Install with: pip install google-cloud-aiplatform"
            )

        # Load configuration
        self.config = VertexAIConfig()

        # Set credentials environment variable
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = self.config.credentials_path

        # Initialize Vertex AI
        try:
            aiplatform.init(
                project=self.config.project_id,
                location=self.config.location
            )

            # Initialize Imagen model
            self.model = ImageGenerationModel.from_pretrained(self.config.model_name)

            print(f"[INFO] Using Google Vertex AI Imagen 4.0 Ultra")
            print(f"[INFO] Project: {self.config.project_id}")
            print(f"[INFO] Location: {self.config.location}")
            print(f"[INFO] Model: {self.config.model_name}")
            print(f"[INFO] Credentials: ...{self.config.credentials_path[-40:]}")

        except Exception as e:
            raise RuntimeError(
                f"Failed to initialize Vertex AI:\n{str(e)}\n\n"
                f"Please check:\n"
                f"1. GOOGLE_CLOUD_PROJECT_ID is set in .env\n"
                f"2. Credentials file exists at: {self.config.credentials_path}\n"
                f"3. Vertex AI API is enabled in Google Cloud Console\n"
                f"4. Billing is enabled for your project\n\n"
                f"See VERTEX_AI_SETUP_GUIDE.md for detailed instructions."
            )

    def generate_image(self, prompt: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        Generate high-quality image using Vertex AI Imagen 4.0 Ultra

        Args:
            prompt (str): The image generation prompt
            max_retries (int): Maximum number of retry attempts

        Returns:
            dict: Contains image data (base64 encoded) and metadata
        """
        last_error = None

        print(f"\n{'='*80}")
        print(f"GOOGLE VERTEX AI - IMAGEN 4.0 ULTRA IMAGE GENERATION")
        print(f"{'='*80}")
        print(f"Project: {self.config.project_id}")
        print(f"Location: {self.config.location}")
        print(f"Model: {self.config.model_name}")
        print(f"Prompt Length: {len(prompt)} characters")
        print(f"Prompt Preview: {prompt[:200]}..." if len(prompt) > 200 else f"Prompt: {prompt}")
        print(f"{'='*80}\n")

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    wait_time = 2 ** attempt  # Exponential backoff: 2s, 4s, 8s
                    print(f"\n   [RETRY {attempt}/{max_retries}] Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)

                print(f"   >> Attempt {attempt + 1}/{max_retries}: Calling Vertex AI Imagen API...")

                # Clean and enhance the prompt
                clean_prompt = prompt.replace('\n', ' ').strip()

                # Enhance prompt for professional architectural photography quality
                enhanced_prompt = (
                    f"{clean_prompt}, "
                    f"professional architectural photography, "
                    f"ultra detailed, 8K UHD resolution, "
                    f"photorealistic rendering, "
                    f"award winning interior design, "
                    f"masterpiece quality, "
                    f"sharp focus, "
                    f"perfect ambient lighting, "
                    f"vivid colors, "
                    f"high-end luxury finishes, "
                    f"magazine quality photograph, "
                    f"architectural digest style"
                )

                print(f"   >> Enhanced prompt: {enhanced_prompt[:150]}...")
                print(f"   >> Generating with Imagen 4.0 Ultra...")

                # Generate image using Vertex AI
                # Documentation: https://cloud.google.com/vertex-ai/docs/generative-ai/image/generate-images
                response = self.model.generate_images(
                    prompt=enhanced_prompt,
                    number_of_images=self.config.default_number_of_images,
                    aspect_ratio=self.config.default_aspect_ratio,
                    safety_filter_level=self.config.safety_filter_level,
                    person_generation="allow_adult"
                )

                print(f"   >> Response received from Vertex AI")

                # Extract image from response
                if response.images and len(response.images) > 0:
                    image = response.images[0]

                    # Get image bytes
                    image_bytes = image._image_bytes

                    # Convert to base64
                    img_base64 = base64.b64encode(image_bytes).decode('utf-8')

                    print(f"   >> Image generated successfully!")
                    print(f"   >> Image size: {len(image_bytes)} bytes")
                    print(f"   >> Base64 length: {len(img_base64)} chars")
                    print(f"   [SUCCESS] Vertex AI image generation completed\n")

                    # Determine image dimensions based on aspect ratio
                    aspect_ratio = self.config.default_aspect_ratio
                    if aspect_ratio == '1:1':
                        width, height = 1024, 1024
                    elif aspect_ratio == '16:9':
                        width, height = 1408, 792
                    elif aspect_ratio == '9:16':
                        width, height = 792, 1408
                    elif aspect_ratio == '4:3':
                        width, height = 1152, 896
                    elif aspect_ratio == '3:4':
                        width, height = 896, 1152
                    else:
                        width, height = 1024, 1024  # Default to square

                    return {
                        'success': True,
                        'image_base64': img_base64,
                        'image_format': 'PNG',
                        'width': width,
                        'height': height,
                        'model': self.config.model_name,
                        'prompt': prompt,
                        'enhanced_prompt': enhanced_prompt,
                        'project_id': self.config.project_id,
                        'location': self.config.location
                    }
                else:
                    error_msg = "No images returned from Vertex AI"
                    print(f"   >> ERROR: {error_msg}")
                    last_error = error_msg

                    if attempt == max_retries - 1:
                        raise Exception(last_error)

            except Exception as e:
                last_error = str(e)
                print(f"\n   [EXCEPTION - Attempt {attempt + 1}/{max_retries}]")
                print(f"   Error type: {type(e).__name__}")
                print(f"   Error message: {str(e)}")

                # Check for specific error types
                if "quota" in str(e).lower() or "rate" in str(e).lower():
                    print(f"   >> Rate limit or quota error detected")
                    if attempt == max_retries - 1:
                        raise Exception(
                            "Rate limit or quota exceeded.\n"
                            "Check your Google Cloud quotas at: "
                            "https://console.cloud.google.com/iam-admin/quotas"
                        )

                elif "permission" in str(e).lower() or "auth" in str(e).lower():
                    print(f"   >> Authentication/Permission error detected")
                    raise Exception(
                        f"Authentication failed:\n{str(e)}\n\n"
                        f"Please check:\n"
                        f"1. Service account has 'Vertex AI User' role\n"
                        f"2. Credentials file is valid\n"
                        f"3. Project ID is correct"
                    )

                elif "billing" in str(e).lower():
                    print(f"   >> Billing error detected")
                    raise Exception(
                        f"Billing error:\n{str(e)}\n\n"
                        f"Please enable billing at: "
                        f"https://console.cloud.google.com/billing"
                    )

                elif "not found" in str(e).lower() or "404" in str(e):
                    print(f"   >> Model or resource not found")
                    raise Exception(
                        f"Resource not found:\n{str(e)}\n\n"
                        f"Please check:\n"
                        f"1. Vertex AI API is enabled\n"
                        f"2. Model name is correct: {self.config.model_name}\n"
                        f"3. Region is correct: {self.config.location}"
                    )

                if attempt == max_retries - 1:
                    print(f"\n   [CRITICAL] All {max_retries} attempts failed!")
                    raise Exception(
                        f"Image generation failed after {max_retries} attempts:\n{last_error}"
                    )

        raise Exception(f"Unexpected error in image generation: {last_error}")

    def generate_image_from_description(self, image_description_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate image from structured image description data

        Args:
            image_description_data (dict): Structured image description

        Returns:
            dict: Image generation result
        """
        # Extract the main image prompt from the description data
        if 'imagePrompt' in image_description_data:
            prompt = image_description_data['imagePrompt']
        else:
            # Fallback: construct prompt from available data
            prompt = self._construct_prompt_from_data(image_description_data)

        # Generate the image using Vertex AI
        return self.generate_image(prompt)

    def _construct_prompt_from_data(self, data: Dict[str, Any]) -> str:
        """
        Construct image prompt from structured data

        Args:
            data (dict): Image description data

        Returns:
            str: Constructed prompt
        """
        parts = []

        # Add style
        if 'style' in data:
            parts.append(f"{data['style']} style")

        # Add key features
        if 'keyFeatures' in data and isinstance(data['keyFeatures'], list):
            parts.append(f"featuring {', '.join(data['keyFeatures'][:3])}")

        # Add materials
        if 'materials' in data and isinstance(data['materials'], list):
            parts.append(f"with {', '.join(data['materials'][:2])}")

        # Add color palette
        if 'colorPalette' in data and isinstance(data['colorPalette'], list):
            parts.append(f"in {' and '.join(data['colorPalette'][:2])} colors")

        # Add lighting
        if 'lighting' in data:
            parts.append(f"{data['lighting']}")

        # Add mood
        if 'mood' in data:
            parts.append(f"{data['mood']} atmosphere")

        # Join all parts
        prompt = ", ".join(parts)

        # Add default if empty
        if not prompt:
            prompt = "Modern interior design, photorealistic, high quality"

        return prompt


# Test function for debugging
def test_vertex_ai_service():
    """
    Test function to verify Vertex AI integration
    """
    print("\n" + "="*80)
    print("TESTING GOOGLE VERTEX AI IMAGEN 4.0 ULTRA")
    print("="*80 + "\n")

    try:
        # Initialize service
        print("Initializing Vertex AI service...")
        service = GeminiImageService()

        # Test prompt
        test_prompt = "A modern bathroom with white tiles, walk-in shower, and natural lighting"

        print(f"\nTesting with prompt: {test_prompt}\n")

        # Generate image
        result = service.generate_image(test_prompt)

        if result['success']:
            print("\n" + "="*80)
            print("TEST SUCCESSFUL!")
            print("="*80)
            print(f"Image format: {result['image_format']}")
            print(f"Model: {result['model']}")
            print(f"Project: {result['project_id']}")
            print(f"Location: {result['location']}")
            print(f"Base64 length: {len(result['image_base64'])} characters")
            print(f"Image data (first 100 chars): {result['image_base64'][:100]}...")

            # Save test image
            try:
                img_data = base64.b64decode(result['image_base64'])
                with open('test_vertex_ai_output.png', 'wb') as f:
                    f.write(img_data)
                print(f"\n[OK] Image saved to: test_vertex_ai_output.png")
            except Exception as e:
                print(f"\n[WARNING] Could not save image: {e}")

            print("\n[OK] Vertex AI integration is working correctly!")
        else:
            print("\n" + "="*80)
            print("TEST FAILED")
            print("="*80)
            print(f"Result: {result}")

    except Exception as e:
        print("\n" + "="*80)
        print("TEST ERROR")
        print("="*80)
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

        print("\n" + "="*80)
        print("TROUBLESHOOTING")
        print("="*80)
        print("1. Make sure you completed the setup in VERTEX_AI_SETUP_GUIDE.md")
        print("2. Check that GOOGLE_CLOUD_PROJECT_ID is set in .env")
        print("3. Verify credentials file exists at: backend/credentials/vertex-ai-credentials.json")
        print("4. Ensure Vertex AI API is enabled in Google Cloud Console")
        print("5. Verify billing is enabled for your project")


if __name__ == "__main__":
    # Run test when script is executed directly
    test_vertex_ai_service()
