"""
Vertex AI Configuration for Google Imagen 4.0 Ultra

This module handles configuration and initialization for Google Cloud Vertex AI
image generation using Imagen models.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class VertexAIConfig:
    """
    Configuration class for Vertex AI Imagen integration
    """

    def __init__(self):
        """Initialize Vertex AI configuration from environment variables"""

        # Google Cloud Project Configuration
        self.project_id = os.getenv('GOOGLE_CLOUD_PROJECT_ID')
        self.location = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')

        # Credentials file path
        self.credentials_path = os.getenv(
            'GOOGLE_APPLICATION_CREDENTIALS',
            str(Path(__file__).parent.parent.parent / 'credentials' / 'vertex-ai-credentials.json')
        )

        # Imagen model configuration
        self.model_name = os.getenv('VERTEX_AI_IMAGEN_MODEL', 'imagen-3.0-generate-001')

        # Image generation parameters
        self.default_aspect_ratio = os.getenv('IMAGEN_ASPECT_RATIO', '1:1')
        self.default_number_of_images = int(os.getenv('IMAGEN_NUMBER_OF_IMAGES', '1'))
        self.safety_filter_level = os.getenv('IMAGEN_SAFETY_FILTER', 'block_some')

        # Validate configuration
        self._validate_config()

    def _validate_config(self):
        """Validate that all required configuration is present"""
        errors = []

        if not self.project_id:
            errors.append(
                "GOOGLE_CLOUD_PROJECT_ID not set in .env file. "
                "Get your project ID from: https://console.cloud.google.com/home/dashboard"
            )

        if not os.path.exists(self.credentials_path):
            errors.append(
                f"Credentials file not found at: {self.credentials_path}\n"
                f"Download service account JSON key from: "
                f"https://console.cloud.google.com/iam-admin/serviceaccounts\n"
                f"Place it in: backend/credentials/vertex-ai-credentials.json"
            )

        if errors:
            error_message = "\n\n".join([
                "=" * 80,
                "VERTEX AI CONFIGURATION ERROR",
                "=" * 80,
                "\n".join(errors),
                "=" * 80,
                "Please complete the setup following: VERTEX_AI_SETUP_GUIDE.md",
                "=" * 80
            ])
            raise ValueError(error_message)

    def get_config_summary(self):
        """Return a summary of the current configuration"""
        return {
            'project_id': self.project_id,
            'location': self.location,
            'credentials_path': self.credentials_path,
            'credentials_exist': os.path.exists(self.credentials_path),
            'model_name': self.model_name,
            'aspect_ratio': self.default_aspect_ratio,
            'safety_filter': self.safety_filter_level
        }

    def print_config(self):
        """Print configuration summary for debugging"""
        config = self.get_config_summary()

        print("\n" + "=" * 80)
        print("VERTEX AI CONFIGURATION")
        print("=" * 80)
        print(f"Project ID: {config['project_id']}")
        print(f"Location: {config['location']}")
        print(f"Model: {config['model_name']}")
        print(f"Credentials Path: {config['credentials_path']}")
        print(f"Credentials Exist: {'YES' if config['credentials_exist'] else 'NO'}")
        print(f"Aspect Ratio: {config['aspect_ratio']}")
        print(f"Safety Filter: {config['safety_filter']}")
        print("=" * 80 + "\n")


# Test configuration
if __name__ == "__main__":
    try:
        config = VertexAIConfig()
        config.print_config()
        print("[OK] Configuration is valid!")
    except ValueError as e:
        print(str(e))
