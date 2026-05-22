"""
Financing API Views
REST endpoints for cost estimation, financing options, and image generation
"""

import os
import io
import json
import base64
import logging
import tempfile
from decimal import Decimal

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from core.services.gemini_service_finance import GeminiService
from core.services.prompt_builder import PromptBuilder
from core.services.gemini_image_service import GeminiImageService
from core.services.financing_rag_service import get_financing_rag_service

logger = logging.getLogger(__name__)


def extract_planning_context(planning_data):
    """
    Extract planning context from planning module data.
    Returns a dict with relevant planning information.
    """
    if not planning_data:
        return None

    project_plan = planning_data.get('projectPlan', {})
    api_plan = planning_data.get('apiPlanData', {})

    return {
        'building_type': project_plan.get('buildingType'),
        'budget': project_plan.get('budget'),
        'bundesland': project_plan.get('bundesland'),
        'goals': project_plan.get('goals', []),
        'financing_preference': project_plan.get('financingPreference'),
        'has_generated_plan': bool(api_plan.get('plan')),
        'project_plan': project_plan,
        'api_plan': api_plan
    }


def merge_planning_into_form_data(form_data, planning_data):
    """
    Merge relevant planning data into form_data for processing.
    """
    if not planning_data:
        return form_data

    project_plan = planning_data.get('projectPlan', {})

    form_data['_planningData'] = planning_data
    form_data['_fromPlanningModule'] = True

    if project_plan.get('budget') and not form_data.get('budget'):
        form_data['budget'] = project_plan.get('budget')

    if project_plan.get('bundesland') and not form_data.get('propertyLocation'):
        form_data['propertyLocation'] = project_plan.get('bundesland')

    return form_data


def parse_json_response(response_text):
    """
    Parse JSON from AI response, handling markdown code blocks.
    """
    text = response_text.strip()

    if text.startswith('```json'):
        text = text.replace('```json', '').replace('```', '').strip()
    elif text.startswith('```'):
        text = text.replace('```', '').strip()

    return json.loads(text)


@method_decorator(csrf_exempt, name='dispatch')
class CostEstimationView(APIView):
    """
    API endpoint for generating cost estimation using Gemini AI.
    Receives user's financing form data and returns cost estimate.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            form_data = dict(request.data)

            planning_data = form_data.pop('planning_data', None)
            if planning_data:
                planning_ctx = extract_planning_context(planning_data)
                logger.info(
                    "Planning data received: budget=%s, location=%s",
                    planning_ctx.get('budget'),
                    planning_ctx.get('bundesland')
                )
                form_data = merge_planning_into_form_data(form_data, planning_data)

            if not form_data.get('renovationType'):
                return Response(
                    {'error': 'renovationType is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prompt_builder = PromptBuilder()
            prompt = prompt_builder.build_cost_estimation_prompt(form_data)

            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                return Response(
                    {'error': 'Gemini API key not configured on server'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            try:
                rag_service = get_financing_rag_service(api_key=api_key)
                rag_result = rag_service.analyze_financing(
                    form_data=form_data,
                    use_cache=True,
                    debug_mode=False,
                    planning_data=planning_data
                )

                cost_estimate = rag_result.get('costEstimate', {})
                rag_metadata = rag_result.get('metadata', {})

                logger.info(
                    "RAG analysis complete: %d documents retrieved",
                    rag_metadata.get('documents_retrieved', 0)
                )

            except Exception as rag_error:
                logger.warning("RAG service failed, using direct Gemini: %s", str(rag_error))

                gemini_service = GeminiService(api_key)
                cost_estimate = gemini_service.generate_cost_estimate(prompt)
                rag_metadata = {'rag_enabled': False, 'fallback': True, 'error': str(rag_error)}
                rag_result = None

            response_data = {
                **cost_estimate,
                '_originalPrompt': prompt,
                '_formData': form_data,
                '_ragEnabled': rag_metadata.get('rag_enabled', True),
                '_ragMetadata': rag_metadata,
                '_fullRagResult': rag_result
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            error_message = str(e)
            logger.error("Cost estimation failed: %s", error_message)

            if "RATE_LIMIT_ERROR" in error_message:
                return Response(
                    {
                        'error': 'API Rate Limit Exceeded',
                        'message': 'Your Gemini API key has exceeded its quota limit.',
                        'details': error_message.replace("RATE_LIMIT_ERROR: ", ""),
                        'suggestions': [
                            'Wait a few minutes before trying again',
                            'Check your Google AI Studio quota at https://aistudio.google.com/',
                            'Consider upgrading to a paid plan for higher quotas',
                            'Verify your API key is correctly configured'
                        ]
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            return Response(
                {
                    'error': 'Failed to generate cost estimation',
                    'message': 'An error occurred while processing your request',
                    'details': error_message
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class MultimodalCostEstimationView(APIView):
    """
    API endpoint for multimodal cost estimation using Gemini 2.0 Flash.
    Accepts text form data + images/videos for more accurate analysis.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        try:
            import google.generativeai as genai
            from PIL import Image

            form_data_raw = request.data.get('form_data', '{}')
            if isinstance(form_data_raw, str):
                form_data = json.loads(form_data_raw)
            else:
                form_data = form_data_raw

            uploaded_files = request.FILES.getlist('files')

            planning_data = None
            planning_data_str = request.data.get('planning_data', None)
            if planning_data_str:
                try:
                    planning_data = json.loads(planning_data_str)
                    form_data = merge_planning_into_form_data(form_data, planning_data)

                    project_plan = planning_data.get('projectPlan', {})
                    if project_plan.get('buildingSize') and not form_data.get('bathroomSize'):
                        form_data['bathroomSize'] = project_plan.get('buildingSize')

                except json.JSONDecodeError as e:
                    logger.warning("Failed to parse planning data: %s", e)

            print("\n" + "="*60)
            print("[Financing - Multimodal Cost Estimation] Starting analysis...")
            print(f"[Financing] Renovation Type: {form_data.get('renovationType', 'N/A')}")
            print(f"[Financing] Files Uploaded: {len(uploaded_files)}")
            if planning_data:
                print("[Financing] Planning Data: Integrated from Planning module")
            print("="*60)
            logger.info(
                "Multimodal request: type=%s, files=%d",
                form_data.get('renovationType', 'N/A'),
                len(uploaded_files)
            )

            if not form_data.get('renovationType'):
                return Response(
                    {'error': 'renovationType is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prompt_builder = PromptBuilder()
            text_prompt = prompt_builder.build_cost_estimation_prompt(form_data)

            if uploaded_files:
                text_prompt += f"""

ADDITIONAL VISUAL CONTEXT:
The user has uploaded {len(uploaded_files)} image(s)/video(s) of the space to be renovated. Please analyze these visuals carefully to:
1. Assess current condition and quality
2. Identify specific challenges or complexities
3. Estimate space dimensions more accurately
4. Adjust cost estimates based on actual condition
5. Note any visible issues that may affect costs

Provide more precise cost estimates based on this visual evidence."""

            if planning_data:
                text_prompt += self._build_planning_context_prompt(planning_data)

            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                return Response(
                    {'error': 'Gemini API key not configured'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')

            content_parts = [text_prompt]
            uploaded_images_base64 = []

            for uploaded_file in uploaded_files:
                file_content = uploaded_file.read()
                file_type = uploaded_file.content_type

                if file_type.startswith('image/'):
                    image = Image.open(io.BytesIO(file_content))
                    content_parts.append(image)

                    uploaded_images_base64.append({
                        'name': uploaded_file.name,
                        'type': file_type,
                        'base64': base64.b64encode(file_content).decode('utf-8')
                    })

                elif file_type.startswith('video/'):
                    import time
                    with tempfile.NamedTemporaryFile(
                        delete=False,
                        suffix=os.path.splitext(uploaded_file.name)[1]
                    ) as tmp:
                        tmp.write(file_content)
                        tmp_path = tmp.name

                    try:
                        video_file = genai.upload_file(tmp_path)

                        while video_file.state.name == "PROCESSING":
                            time.sleep(2)
                            video_file = genai.get_file(video_file.name)

                        if video_file.state.name != "FAILED":
                            content_parts.append(video_file)
                    finally:
                        os.unlink(tmp_path)

            try:
                print("[Financing] Initializing RAG service for cost estimation...")
                rag_service = get_financing_rag_service(api_key=api_key)
                query = f"{form_data.get('renovationType', '')} renovation cost estimation German market 2026"
                print(f"[Financing] RAG Query: {query}")
                relevant_docs = rag_service.retrieve_relevant_docs(query=query, k=4)

                if relevant_docs:
                    print(f"[Financing] RAG context retrieved: {len(relevant_docs)} documents")
                    rag_context = "\n\n=== KNOWLEDGE BASE CONTEXT ===\n"
                    for i, doc in enumerate(relevant_docs, 1):
                        source = doc.metadata.get('source', 'Unknown')
                        print(f"[Financing]   {i}. {source}")
                        rag_context += f"\n[Source {i}]: {doc.page_content[:300]}...\n"
                    content_parts[0] = content_parts[0] + rag_context

                print("[Financing] Generating AI response with Gemini 2.5 Flash...")
                response = model.generate_content(content_parts)
                print(f"[Financing] AI Response received ({len(response.text)} chars)")

                print("[Financing] Parsing cost estimation response...")
                cost_estimate = parse_json_response(response.text)

                # Show detailed cost estimation results
                print(f"\n[Financing] COST ESTIMATION RESULTS:")
                total_cost = cost_estimate.get('totalEstimatedCost', 0)
                print(f"[Financing]   Total Estimated Cost: €{total_cost:,.2f}")

                breakdown = cost_estimate.get('breakdown', [])
                if breakdown:
                    print(f"[Financing]   Cost Breakdown ({len(breakdown)} categories):")
                    for cat in breakdown[:5]:
                        cat_name = cat.get('category', 'Unknown')
                        cat_cost = cat.get('cost', 0)
                        print(f"[Financing]     • {cat_name}: €{cat_cost:,}")

                quality_tiers = cost_estimate.get('qualityTiers', [])
                if quality_tiers:
                    print(f"[Financing]   Quality Tiers ({len(quality_tiers)}):")
                    for tier in quality_tiers:
                        tier_name = tier.get('tier', 'Unknown')
                        tier_cost = tier.get('totalCost', 0)
                        print(f"[Financing]     • {tier_name}: €{tier_cost:,}")

                print("[Financing] Cost estimation completed successfully!")

                response_data = {
                    **cost_estimate,
                    '_originalPrompt': text_prompt,
                    '_formData': form_data,
                    '_multimodal': True,
                    '_filesAnalyzed': len(uploaded_files),
                    '_uploadedImages': uploaded_images_base64,
                    '_ragEnabled': True,
                    '_ragMetadata': {
                        'rag_enabled': True,
                        'backend': 'Gemini 2.0 Multimodal + RAG',
                        'documents_retrieved': len(relevant_docs) if relevant_docs else 0
                    },
                }

            except Exception as rag_error:
                logger.warning("RAG enhancement failed: %s", str(rag_error))

                response = model.generate_content(content_parts)
                cost_estimate = parse_json_response(response.text)

                response_data = {
                    **cost_estimate,
                    '_originalPrompt': text_prompt,
                    '_formData': form_data,
                    '_multimodal': True,
                    '_filesAnalyzed': len(uploaded_files),
                    '_uploadedImages': uploaded_images_base64,
                    '_ragEnabled': False,
                    '_ragMetadata': {
                        'rag_enabled': False,
                        'backend': 'Gemini 2.0 Multimodal Only',
                        'error': str(rag_error)
                    },
                }

            print("\n" + "="*60)
            print("[Financing - Multimodal] ✓ COST ESTIMATION COMPLETED!")
            print(f"[Financing - Multimodal] RAG Enabled: {response_data.get('_ragEnabled', False)}")
            print("="*60 + "\n")

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"[Financing - Multimodal] ✗ ERROR: {str(e)}")
            logger.error("Multimodal cost estimation failed: %s", str(e))
            return Response(
                {
                    'error': 'Failed to generate multimodal cost estimation',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _build_planning_context_prompt(self, planning_data):
        """Build planning context section for the prompt."""
        project_plan = planning_data.get('projectPlan', {})
        api_plan = planning_data.get('apiPlanData', {})

        context = f"""

================================================================================
IMPORTANT: PLANNING MODULE DATA AVAILABLE - USE FOR ACCURATE COST ESTIMATION
================================================================================
The user has already completed the Planning phase. Use this information to provide
cost estimates aligned with their stated budget and project scope.

PROJECT DETAILS FROM PLANNING PHASE:
- Building Type: {project_plan.get('buildingType', 'Not specified')}
- Total Budget: EUR {project_plan.get('budget', 0):,}
- Location: {project_plan.get('bundesland', 'Not specified')}, Germany
- Building Size: {project_plan.get('buildingSize', 'Not specified')} m2
- Renovation Goals: {', '.join(project_plan.get('goals', ['Not specified']))}
- Target Start Date: {project_plan.get('startDate', 'Not specified')}
- Financing Preference: {project_plan.get('financingPreference', 'Not specified')}
- Known Major Issues: {', '.join(project_plan.get('knownMajorIssues', ['None known']))}
- Heritage Protection: {project_plan.get('heritageProtection', 'Not specified')}
- Energy Certificate: {project_plan.get('energyCertificateRating', 'Not specified')}
"""

        if api_plan.get('plan', {}).get('phases'):
            phases = api_plan['plan']['phases']
            context += f"\nGENERATED RENOVATION PLAN ({len(phases)} Phases):\n"

            total_min = 0
            total_max = 0
            for i, phase in enumerate(phases[:5], 1):
                phase_title = phase.get('phase_title', f'Phase {i}')
                cost_range = phase.get('cost_range', {})
                cost_min = cost_range.get('min', 0)
                cost_max = cost_range.get('max', 0)
                total_min += cost_min
                total_max += cost_max
                context += f"  {i}. {phase_title}: EUR {cost_min:,}-EUR {cost_max:,}\n"

            if len(phases) > 5:
                context += f"  ... and {len(phases) - 5} more phases\n"
            context += f"\nPlanned Total Cost Range: EUR {total_min:,} - EUR {total_max:,}\n"

        context += """
================================================================================
INSTRUCTIONS FOR INTEGRATION:
1. Align cost estimates with the stated budget (EUR {budget:,})
2. Ensure costs are realistic for the specified location ({location})
3. Consider the renovation goals when prioritizing cost categories
4. Account for known issues in the cost breakdown
5. Include financing recommendations relevant to their stated preference
================================================================================
""".format(
            budget=project_plan.get('budget', 0),
            location=project_plan.get('bundesland', 'Germany')
        )

        return context


@method_decorator(csrf_exempt, name='dispatch')
class FinancingOptionsView(APIView):
    """
    API endpoint for generating comprehensive financing options based on:
    - Cost estimate data
    - Photo analysis results
    - User's answers to budget/financing questions

    Provides detailed financing recommendations using RAG.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            original_prompt = request.data.get('original_prompt', '')
            cost_estimate = request.data.get('cost_estimate', {})
            form_data = request.data.get('form_data', {})
            photo_analysis = request.data.get('photo_analysis', None)
            user_answers = request.data.get('user_answers', None)
            planning_data = request.data.get('planning_data', None)

            print("\n" + "="*60)
            print("[Financing Options] Starting comprehensive financing analysis...")
            print(f"[Financing Options] Total Estimated Cost: EUR {cost_estimate.get('totalEstimatedCost', 0):,.2f}")
            print(f"[Financing Options] Photo Analysis Available: {photo_analysis is not None}")
            print(f"[Financing Options] User Answers Available: {user_answers is not None}")
            print(f"[Financing Options] Planning Data Available: {planning_data is not None}")
            print("="*60)
            logger.info(
                "Financing options request: total=EUR %s, photo_analysis=%s, answers=%s",
                cost_estimate.get('totalEstimatedCost', 0),
                photo_analysis is not None,
                user_answers is not None
            )

            if not original_prompt or not cost_estimate:
                return Response(
                    {'error': 'original_prompt and cost_estimate are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                return Response(
                    {'error': 'Gemini API key not configured on server'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            try:
                print("[Financing Options] Initializing RAG service...")
                rag_service = get_financing_rag_service(api_key=api_key)
                print("[Financing Options] RAG service initialized ✓")

                print("[Financing Options] Calling analyze_financing_options_only()...")
                financing_options = rag_service.analyze_financing_options_only(
                    form_data=form_data,
                    cost_estimate=cost_estimate,
                    original_prompt=original_prompt,
                    photo_analysis=photo_analysis,
                    user_answers=user_answers,
                    planning_data=planning_data,
                    use_cache=False,
                    debug_mode=False
                )

                rag_metadata = financing_options.get('metadata', {})
                print(f"[Financing Options] Analysis complete! Generated {len(financing_options.get('recommendations', []))} recommendations")
                logger.info(
                    "Financing options generated: %d recommendations",
                    len(financing_options.get('recommendations', []))
                )

            except Exception as rag_error:
                print(f"\n[Financing Options] ⚠ RAG failed, using fallback: {str(rag_error)[:100]}")
                logger.warning(
                    "RAG initialization failed, using fallback: %s",
                    str(rag_error)[:150]
                )

                print("[Financing Options] Building fallback prompt...")
                prompt_builder = PromptBuilder()
                financing_prompt = prompt_builder.build_financing_options_prompt(
                    original_prompt,
                    cost_estimate,
                    form_data
                )

                print("[Financing Options] Generating fallback response with Gemini...")
                gemini_service = GeminiService(api_key)
                financing_options = gemini_service.generate_financing_options(financing_prompt)
                financing_options['_ragEnabled'] = False
                financing_options['_geminiDirect'] = True
                financing_options['_fallback'] = True
                financing_options['_error'] = str(rag_error)
                print("[Financing Options] Fallback response generated ✓")

            print("\n" + "="*60)
            print("[Financing Options] ✓ RESPONSE SENT TO CLIENT")
            print("="*60 + "\n")
            return Response(financing_options, status=status.HTTP_200_OK)

        except Exception as e:
            error_message = str(e)
            logger.error("Financing options generation failed: %s", error_message)

            if "RATE_LIMIT_ERROR" in error_message:
                return Response(
                    {
                        'error': 'API Rate Limit Exceeded',
                        'message': 'Your Gemini API key has exceeded its quota limit.',
                        'details': error_message.replace("RATE_LIMIT_ERROR: ", ""),
                        'suggestions': [
                            'Wait a few minutes before trying again',
                            'Check your Google AI Studio quota at https://aistudio.google.com/',
                            'Consider upgrading to a paid plan for higher quotas'
                        ]
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            return Response(
                {
                    'error': 'Failed to generate financing options',
                    'message': 'An error occurred while processing your request',
                    'details': error_message
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class ImageGenerationView(APIView):
    """
    API endpoint for generating renovation visualization images.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            import google.generativeai as genai
            from PIL import Image

            original_prompt = request.data.get('original_prompt', '')
            cost_estimate = request.data.get('cost_estimate', {})
            form_data = request.data.get('form_data', {})
            uploaded_images = request.data.get('uploaded_images', [])

            logger.info(
                "Image generation request: type=%s, uploaded_images=%d",
                form_data.get('renovationType', 'N/A'),
                len(uploaded_images)
            )

            if not original_prompt or not cost_estimate:
                return Response(
                    {'error': 'original_prompt and cost_estimate are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prompt_builder = PromptBuilder()
            image_prompt = prompt_builder.build_image_generation_prompt(
                original_prompt,
                cost_estimate,
                form_data
            )

            if uploaded_images:
                image_prompt += f"""

IMPORTANT - PHOTO-BASED GENERATION:
The user has uploaded {len(uploaded_images)} photo(s) of their current space. You MUST analyze these photos and create an image prompt that:
1. Maintains the EXACT layout and room structure from the uploaded photo
2. Preserves window positions, door locations, and room shape
3. Shows the SAME space but with the renovation improvements applied
4. Creates a before-to-after transformation of the uploaded photo
5. Keep the viewpoint and camera angle similar to the original photo

This is a photo-based renovation visualization, not a generic room design."""

            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                return Response(
                    {'error': 'Gemini API key not configured on server'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            genai.configure(api_key=api_key)
            text_model = genai.GenerativeModel('gemini-2.5-flash')

            try:
                content_parts = [image_prompt]

                if uploaded_images:
                    for img_data in uploaded_images:
                        img_base64 = img_data.get('base64', '')
                        img_bytes = base64.b64decode(img_base64)
                        img = Image.open(io.BytesIO(img_bytes))
                        content_parts.append(img)

                response = text_model.generate_content(content_parts)
                description_json_text = response.text.strip()

                if description_json_text.startswith('```json'):
                    description_json_text = description_json_text.replace('```json', '').replace('```', '').strip()
                elif description_json_text.startswith('```'):
                    description_json_text = description_json_text.replace('```', '').strip()

                image_description_data = json.loads(description_json_text)
                actual_image_prompt = image_description_data.get('imagePrompt', '')

                if not actual_image_prompt:
                    raise ValueError(
                        f"No imagePrompt field in Gemini response. "
                        f"Received fields: {list(image_description_data.keys())}"
                    )

            except Exception as e:
                logger.error("Failed to generate image description: %s", str(e))
                return Response(
                    {'error': f'Failed to generate image description: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            image_service = GeminiImageService()
            image_result = image_service.generate_image(actual_image_prompt)

            renovation_type = form_data.get('renovationType', 'Renovation')
            design_style = form_data.get('designStyle', 'modern')

            color_scheme = form_data.get('colorScheme', {})
            main_color = color_scheme.get('main', '')
            accent_color = color_scheme.get('accent', '')

            color_text = ""
            if main_color and accent_color:
                color_text = f" with {main_color.lower()} and {accent_color.lower()} tones"
            elif main_color:
                color_text = f" with {main_color.lower()} tones"

            user_friendly_description = (
                f"Professional {design_style.lower()} {renovation_type.lower()} "
                f"renovation visualization{color_text}"
            )

            image_result['prompt'] = user_friendly_description
            image_result['description'] = user_friendly_description

            return Response(image_result, status=status.HTTP_200_OK)

        except Exception as e:
            error_message = str(e)
            logger.error("Image generation failed: %s", error_message)

            if "RATE_LIMIT_ERROR" in error_message:
                return Response(
                    {
                        'error': 'API Rate Limit Exceeded',
                        'message': 'Your Gemini API key has exceeded its quota limit.',
                        'details': error_message.replace("RATE_LIMIT_ERROR: ", "")
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            return Response(
                {
                    'error': 'Failed to generate image description',
                    'message': error_message
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class AIChatView(APIView):
    """
    API endpoint for AI chat assistant.
    Receives user messages and returns AI responses.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    KNOWLEDGE_BASE = """
You are a helpful German home renovation financing advisor. You help users understand financing options for home renovations in Germany.

# Main Financing Options in Germany

## 1. Modernisierungskredit (Modernisation Loan)
- Personal loan for home renovations, usually unsecured
- Up to EUR 50,000-80,000
- Used for: Bathroom/kitchen upgrades, energy-efficient windows, heating, insulation

## 2. Baufinanzierung / Nachfinanzierung
- Mortgage-based financing
- For larger renovations and structural work
- Can extend existing mortgage or take a second one

## 3. KfW Forderkredite (State-Subsidised Loans)
- Low-interest loans via KfW Bank
- Distributed through local banks
- For: Energy-efficient renovations, renewable energy, barrier-free conversions

## 4. BAFA Zuschusse (Cash Grants)
- Direct subsidies from BAFA
- For: Heating systems, renewable energy (heat pumps, solar thermal)
- No repayment required

# Key Programmes (2025)

## KfW Programme 261 / BEG WG
- Energy-efficient house renovations or partial upgrades
- Covers: Insulation, windows, heating
- Requirement: Apply before construction starts, energy consultant required
- Interest rate: 0.01% - 1.5%
- Max amount: EUR 150,000

## KfW Programme 262 - BEG Renovation Grant
- Direct grant for energy-efficient renovations
- Up to EUR 75,000 (up to 50% subsidy)
- No repayment needed
- Can be combined with loans

## KfW Programme 159 - Barrier-Free Conversion
- For accessibility improvements
- Bathrooms, stairs, ramps
- No energy efficiency requirement
- Up to EUR 50,000

## BAFA "Heizen mit Erneuerbaren Energien"
- Renewable heating systems
- Heat pumps, biomass, solar thermal
- Up to 40% subsidy
- Max EUR 70,000
- Apply directly via BAFA portal

Provide helpful, accurate information based on this knowledge. Be friendly and encouraging.
"""

    def post(self, request):
        try:
            import requests

            user_message = request.data.get('message', '')
            conversation_history = request.data.get('conversation_history', [])

            if not user_message:
                return Response(
                    {'error': 'Message is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                return Response(
                    {'error': 'Gemini API key not configured on server'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            full_prompt = self.KNOWLEDGE_BASE + "\n\n"

            for msg in conversation_history:
                if msg.get('role') == 'user':
                    full_prompt += f"User: {msg.get('content', '')}\n"
                elif msg.get('role') == 'assistant':
                    full_prompt += f"Assistant: {msg.get('content', '')}\n"

            full_prompt += f"User: {user_message}\nAssistant:"

            model = "gemini-2.5-flash-lite"
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 800,
                    "topP": 0.95,
                    "topK": 40
                }
            }

            response = requests.post(
                api_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            if not response.ok:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                return Response(
                    {'error': f'Gemini API error: {error_msg}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            data = response.json()
            ai_response = data['candidates'][0]['content']['parts'][0]['text']

            return Response({'response': ai_response}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("AI Chat failed: %s", str(e))
            return Response(
                {
                    'error': 'Failed to get AI response',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class SaveFinancingResultView(APIView):
    """
    API endpoint for saving financing analysis results.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            from core.models import FinancingResult

            form_data = request.data.get('form_data', {})
            cost_estimate = request.data.get('cost_estimate', {})
            financing_options = request.data.get('financing_options')
            image_description = request.data.get('image_description')
            result_name = request.data.get('result_name', '')
            notes = request.data.get('notes', '')
            user_identifier = request.data.get('user_identifier', '')
            rag_metadata = request.data.get('_ragMetadata', {})

            if not form_data or not cost_estimate:
                return Response(
                    {'error': 'form_data and cost_estimate are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            renovation_type = form_data.get('renovationType', 'unknown')
            property_location = form_data.get('propertyLocation', '')

            total_cost = Decimal(str(cost_estimate.get('totalEstimatedCost', 0)))
            cost_breakdown = cost_estimate.get('breakdown', [])
            cost_explanation = cost_estimate.get('explanation', '')

            result = FinancingResult.objects.create(
                renovation_type=renovation_type,
                property_location=property_location,
                form_data=form_data,
                total_estimated_cost=total_cost,
                cost_breakdown=cost_breakdown,
                cost_explanation=cost_explanation,
                financing_options=financing_options.get('recommendations') if financing_options else None,
                financing_summary=financing_options.get('summary') if financing_options else None,
                image_base64=image_description.get('image_base64') if image_description else None,
                image_prompt=image_description.get('prompt') if image_description else None,
                rag_enabled=rag_metadata.get('rag_enabled', False),
                rag_metadata=rag_metadata,
                result_name=result_name,
                notes=notes,
                user_identifier=user_identifier,
            )

            logger.info("Saved financing result ID: %d", result.id)

            return Response({
                'success': True,
                'result_id': result.id,
                'message': 'Financing result saved successfully',
                'result': result.get_summary()
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error("Failed to save financing result: %s", str(e))
            return Response(
                {
                    'error': 'Failed to save financing result',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class FinancingResultsListView(APIView):
    """
    API endpoint for listing all saved financing results.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            from core.models import FinancingResult

            user_identifier = request.query_params.get('user_identifier', '')
            renovation_type = request.query_params.get('renovation_type', '')
            limit = int(request.query_params.get('limit', 50))

            queryset = FinancingResult.objects.all()

            if user_identifier:
                queryset = queryset.filter(user_identifier=user_identifier)

            if renovation_type:
                queryset = queryset.filter(renovation_type=renovation_type)

            queryset = queryset[:limit]
            results = [result.get_summary() for result in queryset]

            return Response({
                'success': True,
                'count': len(results),
                'results': results
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("Failed to list financing results: %s", str(e))
            return Response(
                {
                    'error': 'Failed to list financing results',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class FinancingResultDetailView(APIView):
    """
    API endpoint for retrieving, updating, and deleting a specific financing result.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, result_id):
        try:
            from core.models import FinancingResult

            result = FinancingResult.objects.get(id=result_id)

            return Response({
                'success': True,
                'result': result.get_full_data()
            }, status=status.HTTP_200_OK)

        except FinancingResult.DoesNotExist:
            return Response(
                {'error': 'Financing result not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error("Failed to retrieve financing result: %s", str(e))
            return Response(
                {
                    'error': 'Failed to retrieve financing result',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def patch(self, request, result_id):
        try:
            from core.models import FinancingResult

            result = FinancingResult.objects.get(id=result_id)

            if 'result_name' in request.data:
                result.result_name = request.data['result_name']

            if 'notes' in request.data:
                result.notes = request.data['notes']

            if 'financing_options' in request.data:
                financing_opts = request.data['financing_options']
                result.financing_options = financing_opts.get('recommendations')
                result.financing_summary = financing_opts.get('summary')

            if 'image_description' in request.data:
                image_desc = request.data['image_description']
                result.image_base64 = image_desc.get('image_base64')
                result.image_prompt = image_desc.get('prompt')

            result.save()

            return Response({
                'success': True,
                'message': 'Financing result updated successfully',
                'result': result.get_summary()
            }, status=status.HTTP_200_OK)

        except FinancingResult.DoesNotExist:
            return Response(
                {'error': 'Financing result not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error("Failed to update financing result: %s", str(e))
            return Response(
                {
                    'error': 'Failed to update financing result',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, result_id):
        try:
            from core.models import FinancingResult

            result = FinancingResult.objects.get(id=result_id)
            result.delete()

            return Response({
                'success': True,
                'message': 'Financing result deleted successfully'
            }, status=status.HTTP_200_OK)

        except FinancingResult.DoesNotExist:
            return Response(
                {'error': 'Financing result not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error("Failed to delete financing result: %s", str(e))
            return Response(
                {
                    'error': 'Failed to delete financing result',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class SmartPhotoAnalysisView(APIView):
    """
    API endpoint for intelligent photo analysis and dynamic question generation.

    This endpoint analyzes uploaded photos using Gemini multimodal AI to:
    1. Detect current condition, issues, and features in the space
    2. Generate smart, targeted questions based on what AI sees
    3. Provide accurate estimates by combining visual + user input data
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        try:
            import time
            import google.generativeai as genai
            from PIL import Image

            renovation_type = request.data.get('renovation_type', '')
            if not isinstance(renovation_type, str):
                renovation_type = str(renovation_type)

            uploaded_files = request.FILES.getlist('files')

            planning_data = None
            planning_data_str = request.data.get('planning_data', None)
            if planning_data_str:
                try:
                    planning_data = json.loads(planning_data_str)
                except json.JSONDecodeError as e:
                    logger.warning("Failed to parse planning data: %s", e)
                    planning_data = None

            print("\n" + "="*60)
            print("[Financing - Smart Photo Analysis] Starting AI analysis...")
            print(f"[Financing] Renovation Type: {renovation_type}")
            print(f"[Financing] Photos Uploaded: {len(uploaded_files)}")
            if planning_data:
                print("[Financing] Planning Data: Integrated from Planning module")
            print("="*60)
            logger.info(
                "Smart photo analysis: type=%s, files=%d, planning=%s",
                renovation_type,
                len(uploaded_files),
                planning_data is not None
            )

            if not renovation_type:
                return Response(
                    {'error': 'renovation_type is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not uploaded_files:
                return Response(
                    {'error': 'At least one photo is required for smart analysis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                return Response(
                    {'error': 'Gemini API key not configured'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')

            analysis_prompt = self._build_photo_analysis_prompt(renovation_type, planning_data)

            content_parts = [analysis_prompt]
            uploaded_images_base64 = []

            for uploaded_file in uploaded_files:
                file_content = uploaded_file.read()
                file_type = uploaded_file.content_type

                if file_type.startswith('image/'):
                    image = Image.open(io.BytesIO(file_content))
                    content_parts.append(image)

                    uploaded_images_base64.append({
                        'name': uploaded_file.name,
                        'type': file_type,
                        'base64': base64.b64encode(file_content).decode('utf-8')
                    })

                elif file_type.startswith('video/'):
                    with tempfile.NamedTemporaryFile(
                        delete=False,
                        suffix=os.path.splitext(uploaded_file.name)[1]
                    ) as tmp:
                        tmp.write(file_content)
                        tmp_path = tmp.name

                    try:
                        video_file = genai.upload_file(tmp_path)

                        while video_file.state.name == "PROCESSING":
                            time.sleep(2)
                            video_file = genai.get_file(video_file.name)

                        if video_file.state.name == "ACTIVE":
                            content_parts.append(video_file)

                    finally:
                        os.unlink(tmp_path)

            print("[Financing - Smart Photo] Sending images to Gemini 2.5 Flash for analysis...")
            response = model.generate_content(content_parts)
            print(f"[Financing - Smart Photo] AI Response received ({len(response.text)} chars)")
            print(f"[Financing - Smart Photo] Response preview: {response.text[:150]}...")

            print("[Financing - Smart Photo] Parsing analysis response...")
            analysis_result = self._parse_analysis_response(response.text)

            # Show detailed analysis results
            detected_features = analysis_result.get('detectedFeatures', [])
            detected_issues = analysis_result.get('detectedIssues', [])
            photo_analysis = analysis_result.get('photoAnalysis', {})

            print(f"\n[Financing - Smart Photo] PHOTO ANALYSIS RESULTS:")
            print(f"[Financing - Smart Photo]   Condition Score: {photo_analysis.get('conditionScore', 'N/A')}/10")
            print(f"[Financing - Smart Photo]   Space Size: {photo_analysis.get('estimatedSize', 'N/A')} m²")
            print(f"[Financing - Smart Photo]   Quality Level: {photo_analysis.get('qualityLevel', 'N/A')}")

            if detected_features:
                print(f"\n[Financing - Smart Photo]   DETECTED FEATURES ({len(detected_features)}):")
                for feat in detected_features[:5]:
                    print(f"[Financing - Smart Photo]     • {feat.get('feature', 'Unknown')} ({feat.get('condition', 'N/A')})")

            if detected_issues:
                print(f"\n[Financing - Smart Photo]   DETECTED ISSUES ({len(detected_issues)}):")
                for issue in detected_issues[:5]:
                    print(f"[Financing - Smart Photo]     ⚠ {issue.get('issue', 'Unknown')} - {issue.get('severity', 'N/A')}")

            ai_questions = analysis_result.get('smartQuestions', [])
            ai_question_count = len(ai_questions)
            print(f"\n[Financing - Smart Photo]   AI-Generated Questions: {ai_question_count}")

            try:
                print("\n[Financing - Smart Photo] Enhancing with RAG knowledge...")
                rag_service = get_financing_rag_service(api_key=api_key)
                query = f"{renovation_type} renovation German financing KfW BAFA budget cost estimation DIN standards"
                print(f"[Financing - Smart Photo] RAG Query: {query}")
                relevant_docs = rag_service.retrieve_relevant_docs(query=query, k=6)

                if relevant_docs:
                    print(f"[Financing - Smart Photo] Retrieved {len(relevant_docs)} RAG documents for question generation")
                    all_rag_questions = self._generate_rag_questions(
                        renovation_type, relevant_docs, analysis_result
                    )

                    questions_needed = max(0, 15 - ai_question_count)

                    if questions_needed > 0:
                        existing_ids = {q.get('id', '') for q in ai_questions}

                        priority_categories = [
                            'BUDGET', 'FINANCING', 'GERMAN FINANCING',
                            'HIDDEN COSTS', 'QUALITY', 'SCOPE'
                        ]
                        selected_rag_questions = []

                        for category in priority_categories:
                            if len(selected_rag_questions) >= questions_needed:
                                break
                            for q in all_rag_questions:
                                if len(selected_rag_questions) >= questions_needed:
                                    break
                                if q.get('id') not in existing_ids and category in q.get('category', ''):
                                    selected_rag_questions.append(q)
                                    existing_ids.add(q.get('id'))

                        for q in all_rag_questions:
                            if len(selected_rag_questions) >= questions_needed:
                                break
                            if q.get('id') not in existing_ids:
                                selected_rag_questions.append(q)
                                existing_ids.add(q.get('id'))

                        analysis_result['smartQuestions'].extend(selected_rag_questions)
                        analysis_result['ragEnhanced'] = True
                        analysis_result['ragQuestionsAdded'] = len(selected_rag_questions)
                    else:
                        analysis_result['ragEnhanced'] = True
                        analysis_result['ragQuestionsAdded'] = 0
                else:
                    analysis_result['ragEnhanced'] = False

            except Exception as rag_error:
                logger.warning("RAG enhancement failed: %s", str(rag_error)[:150])
                analysis_result['ragEnhanced'] = False

                if ai_question_count < 15:
                    fallback_questions = self._generate_rag_questions(
                        renovation_type, [], analysis_result
                    )
                    questions_needed = 15 - len(analysis_result.get('smartQuestions', []))
                    if questions_needed > 0:
                        analysis_result['smartQuestions'].extend(
                            fallback_questions[:questions_needed]
                        )

            final_questions = analysis_result.get('smartQuestions', [])
            if len(final_questions) > 15:
                analysis_result['smartQuestions'] = final_questions[:15]

            analysis_result['filesAnalyzed'] = len(uploaded_files)
            analysis_result['renovationType'] = renovation_type
            analysis_result['uploadedImages'] = uploaded_images_base64

            print("\n" + "="*60)
            print("[Financing - Smart Photo] Analysis completed successfully!")
            print(f"[Financing - Smart Photo] Features detected: {len(analysis_result.get('detectedFeatures', []))}")
            print(f"[Financing - Smart Photo] Issues detected: {len(analysis_result.get('detectedIssues', []))}")
            print(f"[Financing - Smart Photo] Smart questions generated: {len(analysis_result.get('smartQuestions', []))}")
            print(f"[Financing - Smart Photo] RAG Enhanced: {analysis_result.get('ragEnhanced', False)}")
            print("="*60 + "\n")
            logger.info(
                "Photo analysis complete: features=%d, issues=%d, questions=%d",
                len(analysis_result.get('detectedFeatures', [])),
                len(analysis_result.get('detectedIssues', [])),
                len(analysis_result.get('smartQuestions', []))
            )

            return Response(analysis_result, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            logger.error("Smart photo analysis failed: %s\n%s", str(e), traceback.format_exc())

            if "429" in str(e):
                return Response(
                    {
                        'error': 'API Rate Limit Exceeded',
                        'message': 'Your Gemini API key has exceeded its quota limit.'
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            return Response(
                {
                    'error': 'Failed to analyze photos',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _build_photo_analysis_prompt(self, renovation_type, planning_data=None):
        """Build comprehensive prompt for photo analysis and question generation."""

        planning_context = ""
        if planning_data:
            project_plan = planning_data.get('projectPlan', {})
            api_plan = planning_data.get('apiPlanData', {})

            planning_context = f"""
================================================================================
IMPORTANT: PLANNING MODULE DATA AVAILABLE
================================================================================
The user has already completed the Planning phase. Use this information to provide
more accurate analysis and cost-aligned questions.

PROJECT DETAILS FROM PLANNING PHASE:
- Building Type: {project_plan.get('buildingType', 'Not specified')}
- Budget: EUR {project_plan.get('budget', 0):,}
- Location: {project_plan.get('bundesland', 'Not specified')}, Germany
- Building Size: {project_plan.get('buildingSize', 'Not specified')} m2
- Renovation Goals: {', '.join(project_plan.get('goals', ['Not specified']))}
- Target Start Date: {project_plan.get('startDate', 'Not specified')}
- Financing Preference: {project_plan.get('financingPreference', 'Not specified')}
- Incentive Interest: {project_plan.get('incentiveIntent', 'Not specified')}
- Heritage Protection: {project_plan.get('heritageProtection', 'Not specified')}
- Living During Renovation: {project_plan.get('livingDuringRenovation', 'Not specified')}
- Energy Certificate Rating: {project_plan.get('energyCertificateRating', 'Not specified')}
- Known Major Issues: {', '.join(project_plan.get('knownMajorIssues', ['None known']))}
- Surveys Required: {', '.join(project_plan.get('surveysRequired', ['Not specified']))}
- Neighbor Impacts: {project_plan.get('neighborImpacts', 'Not specified')}
"""
            if project_plan.get('heatingSystem'):
                planning_context += f"- Current Heating System: {project_plan.get('heatingSystem')}\n"
            if project_plan.get('insulation'):
                planning_context += f"- Current Insulation: {project_plan.get('insulation')}\n"
            if project_plan.get('windowsType'):
                planning_context += f"- Current Windows Type: {project_plan.get('windowsType')}\n"

            if api_plan.get('plan', {}).get('phases'):
                phases = api_plan['plan']['phases']
                planning_context += f"\nGENERATED RENOVATION PLAN ({len(phases)} Phases):\n"
                for i, phase in enumerate(phases[:5], 1):
                    phase_title = phase.get('phase_title', f'Phase {i}')
                    phase_duration = phase.get('estimated_duration', 'N/A')
                    phase_cost = phase.get('cost_range', {})
                    cost_min = phase_cost.get('min', 0)
                    cost_max = phase_cost.get('max', 0)
                    planning_context += f"  {i}. {phase_title}: {phase_duration}, EUR {cost_min:,}-EUR {cost_max:,}\n"

                if len(phases) > 5:
                    planning_context += f"  ... and {len(phases) - 5} more phases\n"

            if api_plan.get('plan', {}).get('permits_required'):
                permits = api_plan['plan']['permits_required']
                planning_context += f"\nPERMITS IDENTIFIED ({len(permits)}):\n"
                for permit in permits[:3]:
                    permit_name = permit.get('permit_name', 'Unknown')
                    planning_context += f"  - {permit_name}\n"

            planning_context += """
================================================================================
USE THIS PLANNING DATA TO:
1. Align your photo analysis with the stated budget (EUR {budget:,})
2. Focus questions on gaps not covered by planning data
3. Validate if photo shows conditions matching stated issues
4. Skip questions about information already provided
5. Provide more accurate cost estimates using the known budget
================================================================================
""".format(budget=project_plan.get('budget', 0))

        type_instructions = {
            'bathroom': """
BATHROOM-SPECIFIC ANALYSIS:
- Identify all visible fixtures: toilet, shower, bathtub, sink/basin, vanity, mirror
- Check shower/tub type: walk-in, standard, corner, wet room
- Assess tile condition: cracked, stained, mold, outdated, missing grout
- Check for water damage signs: staining, peeling paint, mold/mildew
- Identify plumbing visible: exposed pipes, modern/outdated fittings
- Note ventilation: window, extractor fan, none visible
- Assess lighting: natural light, fixture types, adequacy
- Check accessibility: step-in shower, grab bars, floor level entry
- Estimate room dimensions from fixtures (toilets approx 40cm, doors approx 80cm)
""",
            'kitchen': """
KITCHEN-SPECIFIC ANALYSIS:
- Identify cabinet style: modern, traditional, outdated, damaged
- Check countertop material: laminate, granite, wood, tile
- Assess appliance condition and type: built-in, freestanding, age
- Look for ventilation: range hood, extractor, window
- Check flooring: tile, vinyl, wood, condition
- Identify plumbing fixtures: sink type, faucet condition
- Note lighting: under-cabinet, pendant, recessed, natural
- Estimate kitchen layout: galley, L-shape, U-shape, island
- Check storage capacity and organization
""",
            'basement': """
BASEMENT-SPECIFIC ANALYSIS:
- Check for moisture/water intrusion signs: stains, efflorescence, mold
- Assess ceiling height and headroom
- Identify current use: storage, utility, unfinished, partially finished
- Check foundation walls: concrete, block, stone, condition
- Note existing utilities: HVAC, water heater, electrical panel
- Assess natural light: windows, egress requirements
- Check flooring: concrete, damaged, moisture issues
- Identify insulation: visible, type, condition
""",
            'roofing': """
ROOFING-SPECIFIC ANALYSIS:
- Identify roofing material: tiles, shingles, metal, flat roof
- Check for visible damage: missing tiles, sagging, moss/algae
- Assess gutters and drainage: condition, blockages
- Note chimney condition if visible
- Check for skylights or roof windows
- Identify ventilation: ridge vents, soffit vents
- Estimate roof pitch/angle
- Check flashing around penetrations
"""
        }

        specific_instructions = type_instructions.get(renovation_type, """
GENERAL RENOVATION ANALYSIS:
- Identify the room type and current function
- Assess overall condition: good, fair, poor, dilapidated
- Check walls: paint, wallpaper, damage, moisture
- Assess flooring: type, condition, level
- Note windows and doors: style, condition, glazing
- Check lighting: type, adequacy, fixtures
- Identify electrical: outlets, switches, visible wiring
- Note any visible structural concerns
""")

        prompt = f"""You are an expert German renovation consultant with 20+ years of experience. Analyze these photos of a {renovation_type} space that needs renovation.
{planning_context}
{specific_instructions}

CRITICAL ANALYSIS TASKS:

1. PHOTO ANALYSIS - Examine EVERY detail visible:
   - Current overall condition (rate: excellent/good/fair/poor/dilapidated)
   - Age estimation of the space/fixtures
   - Quality level of existing materials
   - Style/era (modern, 80s, 70s, pre-war, etc.)
   - Approximate dimensions based on standard fixture sizes

2. ISSUE DETECTION - Identify ALL visible problems:
   - Structural issues (cracks, settling, water damage)
   - Cosmetic issues (outdated, worn, stained)
   - Safety concerns (electrical, mold, ventilation)
   - Code compliance concerns (accessibility, German DIN standards)

3. FEATURE DETECTION - List everything you can see:
   - Existing fixtures and their condition
   - Materials used (tiles, counters, flooring)
   - Layout and space utilization
   - Natural light and ventilation

4. SMART QUESTIONS - Generate exactly 15 highly targeted questions for financing budget accuracy:
   You MUST generate exactly 15 questions across these categories to help the user understand their financing budget:

   BUDGET & FINANCIAL QUESTIONS (3-4 questions):
   - Overall budget range and flexibility
   - Payment timeline preferences (lump sum vs staged)
   - Financing method preference (cash, loan, government programs)
   - Cost priority areas (where to invest vs economize)

   SCOPE & PRIORITY QUESTIONS (3-4 questions):
   - What elements MUST be changed vs optional upgrades
   - Priority ranking of different work areas
   - Minimum acceptable outcome vs ideal outcome
   - Timeline urgency and constraints

   QUALITY & MATERIALS QUESTIONS (2-3 questions):
   - Quality tier preferences (budget/standard/premium/luxury)
   - Specific brand preferences or requirements
   - Sustainability/eco-friendly material preferences

   HIDDEN COST FACTORS (2-3 questions):
   - Plumbing/electrical age and condition (not visible in photos)
   - Previous renovation history
   - Known issues not visible in photos
   - Permit and approval requirements

   GERMAN FINANCING ELIGIBILITY (2-3 questions):
   - KfW program interest (159 accessibility, 261/262 energy)
   - BAFA subsidy eligibility
   - Tax deduction awareness
   - Energy efficiency goals (affects financing options)

   Each question MUST:
   - Directly impact cost estimation accuracy
   - Help determine financing options eligibility
   - Be specific to what you detected (or could not detect) in the photos
   - Include cost impact indicators for each option

RESPOND IN THIS EXACT JSON FORMAT:
{{
  "photoAnalysis": {{
    "overallCondition": "good|fair|poor|dilapidated",
    "conditionScore": 1-10,
    "estimatedAge": "2020s|2010s|2000s|1990s|1980s|older",
    "currentStyle": "modern|transitional|traditional|outdated|mixed",
    "estimatedSize": {{
      "sqm": <number>,
      "confidence": "high|medium|low"
    }},
    "qualityLevel": "luxury|premium|standard|budget|mixed",
    "summary": "2-3 sentence detailed summary of what you see",
    "keyObservations": [
      "Detailed observation 1 with specific details",
      "Detailed observation 2",
      "Detailed observation 3"
    ]
  }},
  "detectedFeatures": [
    {{
      "feature": "Feature name (e.g., Walk-in shower)",
      "condition": "good|fair|poor",
      "notes": "Specific details about this feature",
      "replacementNeeded": true|false,
      "estimatedCostImpact": "low|medium|high"
    }}
  ],
  "detectedIssues": [
    {{
      "issue": "Issue description (e.g., Visible mold on ceiling)",
      "severity": "critical|major|minor|cosmetic",
      "location": "Where in the space",
      "estimatedRepairCost": "EUR 500-1000",
      "mustAddress": true|false,
      "germanRegulationRelevant": true|false
    }}
  ],
  "smartQuestions": [
    {{
      "id": "q1",
      "category": "Category (e.g., PLUMBING, BUDGET, TIMELINE)",
      "question": "The specific question to ask",
      "reason": "Why this question is important based on photo analysis",
      "type": "single_choice|multi_select|range_slider|text_input",
      "required": true|false,
      "options": [
        {{"value": "option1", "label": "Option Label", "description": "Details", "costImpact": "low|medium|high"}}
      ],
      "expertHint": "Expert advice for answering this question"
    }}
  ],
  "analysisConfidence": {{
    "overall": "high|medium|low",
    "dimensionsConfidence": "high|medium|low",
    "conditionConfidence": "high|medium|low",
    "issuesConfidence": "high|medium|low"
  }},
  "preliminaryEstimate": {{
    "rangeMin": <number>,
    "rangeMax": <number>,
    "currency": "EUR",
    "confidence": "preliminary - will be refined after questions answered",
    "keyFactors": ["Factor 1 affecting estimate", "Factor 2"]
  }}
}}

CRITICAL RULES:
1. Be SPECIFIC - don't be vague. "Old tiles" should be "1980s-era brown ceramic wall tiles showing grout discoloration"
2. Questions must be TARGETED to what you see - don't ask generic questions
3. Generate EXACTLY 15 questions - no more, no less
4. Each question should have clear options that help narrow down costs with costImpact indicators
5. Include at least 3 questions about German-specific financing (KfW, BAFA, accessibility, energy)
6. Questions should cover: BUDGET, SCOPE, QUALITY, HIDDEN_COSTS, FINANCING categories
7. Estimate costs in EUR using German 2026 market rates
8. Return ONLY valid JSON - no markdown, no extra text
9. Every question must have options with costImpact: "low", "medium", "high", or "savings" (for financing options)
10. Questions should help user understand: total budget needed, financing eligibility, cost-saving opportunities"""

        return prompt

    def _parse_analysis_response(self, response_text):
        """Parse the AI response and extract JSON."""
        response_text = response_text.replace('```json', '').replace('```', '').strip()

        start = response_text.find('{')
        end = response_text.rfind('}') + 1

        if start != -1 and end > start:
            json_str = response_text[start:end]
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                logger.warning("JSON parse error: %s", e)
                return self._generate_fallback_analysis()

        return self._generate_fallback_analysis()

    def _generate_fallback_analysis(self):
        """Generate fallback analysis if AI parsing fails."""
        return {
            "photoAnalysis": {
                "overallCondition": "fair",
                "conditionScore": 5,
                "estimatedAge": "2000s",
                "currentStyle": "mixed",
                "estimatedSize": {"sqm": 8, "confidence": "low"},
                "qualityLevel": "standard",
                "summary": "Unable to fully analyze photos. Please answer the following questions for accurate estimation.",
                "keyObservations": ["Photo analysis requires additional information"]
            },
            "detectedFeatures": [],
            "detectedIssues": [],
            "smartQuestions": [
                {
                    "id": "fallback_q1",
                    "category": "PROPERTY DETAILS",
                    "question": "What is the approximate size of the space in square meters?",
                    "reason": "Size is crucial for accurate cost estimation",
                    "type": "range_slider",
                    "required": True,
                    "min": 3,
                    "max": 30,
                    "step": 1,
                    "unit": "m2",
                    "defaultValue": 8,
                    "expertHint": "Measure length x width if unsure"
                },
                {
                    "id": "fallback_q2",
                    "category": "CONDITION",
                    "question": "How would you describe the current condition?",
                    "reason": "Condition affects scope of work needed",
                    "type": "single_choice",
                    "required": True,
                    "options": [
                        {"value": "good", "label": "Good", "description": "Minor updates needed", "costImpact": "low"},
                        {"value": "fair", "label": "Fair", "description": "Moderate renovation needed", "costImpact": "medium"},
                        {"value": "poor", "label": "Poor", "description": "Major renovation required", "costImpact": "high"},
                        {"value": "dilapidated", "label": "Dilapidated", "description": "Complete gut renovation", "costImpact": "high"}
                    ],
                    "expertHint": "Consider age of fixtures, visible damage, and functionality"
                },
                {
                    "id": "fallback_q3",
                    "category": "QUALITY",
                    "question": "What quality level are you targeting?",
                    "reason": "Quality preference significantly impacts material costs",
                    "type": "single_choice",
                    "required": True,
                    "options": [
                        {"value": "budget", "label": "Budget-Friendly", "description": "Functional basics", "costImpact": "low"},
                        {"value": "standard", "label": "Standard Quality", "description": "Good quality, trusted brands", "costImpact": "medium"},
                        {"value": "premium", "label": "Premium Quality", "description": "High-end German brands", "costImpact": "high"},
                        {"value": "luxury", "label": "Luxury", "description": "Designer fixtures, custom work", "costImpact": "high"}
                    ],
                    "expertHint": "Premium German brands like Villeroy & Boch, Duravit, Hansgrohe offer excellent durability"
                }
            ],
            "analysisConfidence": {
                "overall": "low",
                "dimensionsConfidence": "low",
                "conditionConfidence": "low",
                "issuesConfidence": "low"
            },
            "preliminaryEstimate": {
                "rangeMin": 15000,
                "rangeMax": 35000,
                "currency": "EUR",
                "confidence": "very preliminary - needs more information",
                "keyFactors": ["Photo analysis incomplete", "User input required"]
            }
        }

    def _generate_rag_questions(self, renovation_type, relevant_docs, analysis_result):
        """
        Generate comprehensive RAG-enhanced questions for financing budget understanding.
        Uses retrieved knowledge base documents to create highly relevant questions.
        """
        rag_questions = []

        detected_features = [
            f.get('feature', '').lower()
            for f in analysis_result.get('detectedFeatures', [])
        ]

        # Budget Range Question
        rag_questions.append({
            "id": "rag_budget_range",
            "category": "BUDGET",
            "question": "What is your overall budget range for this renovation?",
            "reason": "Knowing your budget helps us recommend appropriate materials, finishes, and financing options",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "under_10k", "label": "Under EUR 10,000", "description": "Basic refresh - cosmetic changes only", "costImpact": "low"},
                {"value": "10k_20k", "label": "EUR 10,000 - 20,000", "description": "Moderate renovation - some fixture replacement", "costImpact": "medium"},
                {"value": "20k_35k", "label": "EUR 20,000 - 35,000", "description": "Comprehensive renovation - most elements replaced", "costImpact": "medium"},
                {"value": "35k_50k", "label": "EUR 35,000 - 50,000", "description": "Premium renovation - high-quality throughout", "costImpact": "high"},
                {"value": "over_50k", "label": "Over EUR 50,000", "description": "Luxury renovation - designer fixtures, custom work", "costImpact": "high"}
            ],
            "expertHint": "German bathroom renovations average EUR 800-1,200/m2 for standard quality, EUR 1,500-2,500/m2 for premium"
        })

        # Budget Flexibility Question
        rag_questions.append({
            "id": "rag_budget_flexibility",
            "category": "BUDGET",
            "question": "How flexible is your budget if unexpected costs arise?",
            "reason": "Renovation projects often encounter unforeseen issues. Understanding flexibility helps plan contingencies",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "fixed", "label": "Fixed - Cannot exceed", "description": "Hard limit, must work within budget", "costImpact": "low"},
                {"value": "slight_flex", "label": "Slightly flexible (+10%)", "description": "Small buffer for essentials only", "costImpact": "medium"},
                {"value": "moderate_flex", "label": "Moderately flexible (+20%)", "description": "Room for quality upgrades or issues", "costImpact": "medium"},
                {"value": "very_flex", "label": "Very flexible (+30% or more)", "description": "Open to recommendations and upgrades", "costImpact": "high"}
            ],
            "expertHint": "We recommend 15-20% contingency for renovations. Older buildings may need 25-30%"
        })

        # Financing Method Question
        rag_questions.append({
            "id": "rag_financing_method",
            "category": "FINANCING",
            "question": "How do you plan to finance this renovation?",
            "reason": "Different financing methods affect total cost and may qualify you for government programs",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "cash", "label": "Cash/Savings", "description": "Pay upfront from savings", "costImpact": "none"},
                {"value": "bank_loan", "label": "Bank Renovation Loan", "description": "Standard bank financing (3-6% interest)", "costImpact": "medium"},
                {"value": "kfw_loan", "label": "KfW Government Loan", "description": "Low-interest government loan (as low as 0.01%)", "costImpact": "savings"},
                {"value": "mortgage", "label": "Mortgage Extension", "description": "Add to existing mortgage", "costImpact": "low"},
                {"value": "unsure", "label": "Not sure yet", "description": "Need guidance on best options", "costImpact": "none"}
            ],
            "expertHint": "KfW loans can save EUR 5,000-15,000 in interest compared to standard bank loans"
        })

        # KfW Programs Question
        rag_questions.append({
            "id": "rag_kfw_programs",
            "category": "GERMAN FINANCING",
            "question": "Which German government financing programs interest you?",
            "reason": "KfW and BAFA programs can provide grants or low-interest loans, reducing your total costs significantly",
            "type": "multi_select",
            "required": False,
            "options": [
                {"value": "kfw_159", "label": "KfW 159 - Accessibility (up to EUR 50,000)", "description": "For barrier-free modifications: grab bars, walk-in shower, wider doors", "costImpact": "savings"},
                {"value": "kfw_261", "label": "KfW 261 - Energy Efficient Building", "description": "For energy-saving renovations with up to 50% subsidy", "costImpact": "savings"},
                {"value": "kfw_262", "label": "KfW 262 - Individual Measures", "description": "For single energy efficiency measures (insulation, windows)", "costImpact": "savings"},
                {"value": "bafa", "label": "BAFA Heating Grants (up to 40%)", "description": "For heat pumps, solar thermal, biomass heating", "costImpact": "savings"},
                {"value": "state_programs", "label": "State/Regional Programs", "description": "Additional programs from your Bundesland", "costImpact": "savings"},
                {"value": "none", "label": "Not interested in government programs", "description": "Standard financing only", "costImpact": "none"}
            ],
            "expertHint": "Combining KfW and BAFA can reduce renovation costs by 30-50%. Must apply BEFORE starting work!"
        })

        # Accessibility Question
        if not any('grab' in f or 'accessible' in f or 'barrier' in f for f in detected_features):
            rag_questions.append({
                "id": "rag_accessibility",
                "category": "ACCESSIBILITY (KfW 159)",
                "question": "Do you need accessibility features? (Qualifies for KfW 159 financing)",
                "reason": "Adding DIN 18040-compliant accessibility features qualifies for KfW 159 program with up to EUR 50,000 loan at preferential rates",
                "type": "multi_select",
                "required": False,
                "options": [
                    {"value": "grab_bars", "label": "Grab Bars & Support Rails", "description": "Near toilet, shower, bathtub - adds EUR 200-500", "costImpact": "low"},
                    {"value": "walk_in_shower", "label": "Floor-Level Walk-in Shower", "description": "No step entry (DIN compliant) - adds EUR 1,500-3,000", "costImpact": "medium"},
                    {"value": "raised_toilet", "label": "Raised/Comfort Height Toilet", "description": "46cm seat height - adds EUR 300-600", "costImpact": "low"},
                    {"value": "wide_door", "label": "Wider Door (80cm+ clear width)", "description": "Wheelchair accessible - adds EUR 500-1,200", "costImpact": "medium"},
                    {"value": "anti_slip", "label": "Anti-Slip Flooring", "description": "R10-R11 rated floor tiles - adds EUR 20-40/m2", "costImpact": "low"},
                    {"value": "none", "label": "No accessibility requirements", "description": "Standard fixtures only", "costImpact": "none"}
                ],
                "expertHint": "Even minor accessibility additions can qualify for KfW 159. Consider future needs - average stay in home is 20+ years"
            })

        # Energy Efficiency Question
        rag_questions.append({
            "id": "rag_energy_efficiency",
            "category": "ENERGY EFFICIENCY (KfW 261/262)",
            "question": "What energy efficiency improvements would you consider?",
            "reason": "Energy-efficient upgrades can qualify for KfW 261/262 programs with up to 50% subsidy and reduce ongoing utility costs",
            "type": "multi_select",
            "required": False,
            "options": [
                {"value": "led_lighting", "label": "LED Lighting Throughout", "description": "Reduces energy by 80% - adds EUR 200-500", "costImpact": "low"},
                {"value": "efficient_ventilation", "label": "Energy-Efficient Ventilation", "description": "Heat recovery ventilation - adds EUR 800-2,000", "costImpact": "medium"},
                {"value": "water_saving", "label": "Water-Saving Fixtures", "description": "Low-flow toilets, aerated faucets - adds EUR 300-800", "costImpact": "low"},
                {"value": "underfloor_heating", "label": "Efficient Underfloor Heating", "description": "Electric or water-based - adds EUR 50-100/m2", "costImpact": "medium"},
                {"value": "insulation", "label": "Wall/Ceiling Insulation", "description": "If walls are opened anyway - adds EUR 40-80/m2", "costImpact": "medium"},
                {"value": "none", "label": "No energy efficiency focus", "description": "Standard fixtures", "costImpact": "none"}
            ],
            "expertHint": "Water-saving fixtures pay for themselves in 2-3 years. German water costs approx EUR 5/m3 including wastewater"
        })

        # Scope Question
        rag_questions.append({
            "id": "rag_scope",
            "category": "SCOPE",
            "question": "What is the scope of your renovation?",
            "reason": "Understanding scope helps estimate labor costs, which are 40-60% of total renovation cost in Germany",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "cosmetic", "label": "Cosmetic Refresh", "description": "Paint, fixtures, accessories - keep layout", "costImpact": "low"},
                {"value": "partial", "label": "Partial Renovation", "description": "Replace some fixtures, keep plumbing locations", "costImpact": "medium"},
                {"value": "complete", "label": "Complete Renovation", "description": "Replace everything, same layout", "costImpact": "high"},
                {"value": "gut_reno", "label": "Gut Renovation", "description": "Strip to studs, new layout possible", "costImpact": "high"}
            ],
            "expertHint": "Moving plumbing adds EUR 1,500-4,000. Keeping existing drain locations saves significantly"
        })

        # Timeline Question
        rag_questions.append({
            "id": "rag_timeline",
            "category": "TIMELINE",
            "question": "What is your timeline for completing this renovation?",
            "reason": "Rush jobs cost 15-30% more. Flexible timelines allow better contractor pricing and material sourcing",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "urgent", "label": "Urgent (within 1 month)", "description": "Need it done quickly - premium pricing", "costImpact": "high"},
                {"value": "soon", "label": "Soon (1-3 months)", "description": "Standard scheduling", "costImpact": "medium"},
                {"value": "flexible", "label": "Flexible (3-6 months)", "description": "Can wait for better pricing/availability", "costImpact": "low"},
                {"value": "planning", "label": "Planning ahead (6+ months)", "description": "Maximum flexibility for best deals", "costImpact": "low"}
            ],
            "expertHint": "German contractors are busiest March-October. Winter renovations can be 10-20% cheaper"
        })

        # Quality Tier Question
        rag_questions.append({
            "id": "rag_quality_tier",
            "category": "QUALITY",
            "question": "What quality level do you prefer for fixtures and materials?",
            "reason": "Quality tier is the biggest factor in material costs, ranging from EUR 3,000 to EUR 25,000+ for fixtures alone",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "budget", "label": "Budget-Friendly", "description": "Functional basics - Bauhaus, OBI brands", "costImpact": "low"},
                {"value": "standard", "label": "Standard Quality", "description": "Good brands - Ideal Standard, Grohe", "costImpact": "medium"},
                {"value": "premium", "label": "Premium Quality", "description": "German premium - Duravit, Hansgrohe, Villeroy & Boch", "costImpact": "high"},
                {"value": "luxury", "label": "Luxury/Designer", "description": "Designer brands - Dornbracht, Kaldewei, custom work", "costImpact": "high"}
            ],
            "expertHint": "Premium German brands offer 10-25 year warranties vs 2-5 years for budget options"
        })

        # Materials Question
        rag_questions.append({
            "id": "rag_materials",
            "category": "MATERIALS",
            "question": "Do you have specific material preferences?",
            "reason": "Material choices can double or triple costs. Natural stone costs 3-5x ceramic tiles",
            "type": "multi_select",
            "required": False,
            "options": [
                {"value": "ceramic_tiles", "label": "Ceramic/Porcelain Tiles", "description": "EUR 20-80/m2 - most common choice", "costImpact": "low"},
                {"value": "natural_stone", "label": "Natural Stone (Marble, Granite)", "description": "EUR 80-300/m2 - luxury option", "costImpact": "high"},
                {"value": "large_format", "label": "Large Format Tiles (60x60+)", "description": "EUR 40-120/m2 - modern look, more waste", "costImpact": "medium"},
                {"value": "microcement", "label": "Microcement/Concrete Look", "description": "EUR 60-150/m2 - seamless, modern", "costImpact": "medium"},
                {"value": "wood_look", "label": "Wood-Look Tiles", "description": "EUR 30-80/m2 - warm appearance", "costImpact": "medium"},
                {"value": "no_preference", "label": "No specific preference", "description": "Open to recommendations", "costImpact": "none"}
            ],
            "expertHint": "Large format tiles require perfectly level substrate - add EUR 20-40/m2 for floor preparation"
        })

        # Plumbing Condition Question
        rag_questions.append({
            "id": "rag_plumbing_condition",
            "category": "HIDDEN COSTS",
            "question": "What do you know about your plumbing system?",
            "reason": "Hidden plumbing issues are the #1 cause of budget overruns. Old pipes may need replacement",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "modern", "label": "Modern (installed last 20 years)", "description": "Likely copper or plastic - minimal risk", "costImpact": "low"},
                {"value": "older", "label": "Older (20-40 years)", "description": "May need inspection - moderate risk", "costImpact": "medium"},
                {"value": "very_old", "label": "Very old (40+ years or lead pipes)", "description": "Likely needs replacement - add EUR 3,000-8,000", "costImpact": "high"},
                {"value": "unknown", "label": "Don't know", "description": "Recommend inspection before quote", "costImpact": "medium"}
            ],
            "expertHint": "Lead pipes (pre-1970s) must be replaced. Galvanized steel (1960s-80s) often corroded inside"
        })

        # Electrical Condition Question
        rag_questions.append({
            "id": "rag_electrical_condition",
            "category": "HIDDEN COSTS",
            "question": "What is the age of your electrical system?",
            "reason": "German bathroom regulations require specific circuits. Old wiring may need upgrading for safety",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "modern", "label": "Modern (has RCD/FI protection)", "description": "Meets current standards", "costImpact": "low"},
                {"value": "older", "label": "Older but functional", "description": "May need additional circuits", "costImpact": "medium"},
                {"value": "very_old", "label": "Pre-1990 wiring", "description": "Likely needs upgrade - add EUR 1,500-3,500", "costImpact": "high"},
                {"value": "unknown", "label": "Not sure", "description": "Electrician inspection recommended", "costImpact": "medium"}
            ],
            "expertHint": "German bathrooms need dedicated circuits with RCD (30mA). Underfloor heating requires separate circuit"
        })

        # Known Issues Question
        rag_questions.append({
            "id": "rag_known_issues",
            "category": "HIDDEN COSTS",
            "question": "Are there any known issues not visible in the photos?",
            "reason": "Disclosing known issues helps provide accurate estimates and avoid surprise costs",
            "type": "multi_select",
            "required": False,
            "options": [
                {"value": "water_damage", "label": "Previous Water Damage", "description": "May need substrate repair - EUR 500-3,000", "costImpact": "high"},
                {"value": "mold", "label": "Mold or Mildew Issues", "description": "Requires professional remediation - EUR 800-2,500", "costImpact": "high"},
                {"value": "drainage", "label": "Slow Drainage Problems", "description": "May need pipe work - EUR 300-1,500", "costImpact": "medium"},
                {"value": "ventilation", "label": "Ventilation/Humidity Issues", "description": "May need exhaust fan upgrade - EUR 400-1,200", "costImpact": "medium"},
                {"value": "structural", "label": "Floor/Wall Structural Issues", "description": "Needs assessment - EUR 1,000-5,000+", "costImpact": "high"},
                {"value": "none", "label": "No known issues", "description": "Space appears problem-free", "costImpact": "none"}
            ],
            "expertHint": "Being upfront about issues saves money. Hidden problems discovered during work cause delays and premium charges"
        })

        # Property Type Question
        rag_questions.append({
            "id": "rag_property_type",
            "category": "LOGISTICS",
            "question": "What type of property is this?",
            "reason": "Property type affects access, permits, and neighbor considerations. Apartments need approval processes",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "apartment", "label": "Apartment (Eigentumswohnung)", "description": "May need WEG approval - add 2-4 weeks", "costImpact": "low"},
                {"value": "house", "label": "Single Family House", "description": "Full flexibility, easier access", "costImpact": "none"},
                {"value": "terraced", "label": "Terraced/Row House", "description": "Consider neighbor walls", "costImpact": "low"},
                {"value": "rental", "label": "Rental Property (Landlord)", "description": "Different material considerations", "costImpact": "low"}
            ],
            "expertHint": "Apartments: Check Teilungserklarung for renovation restrictions. Waterproofing often needs WEG documentation"
        })

        # DIY Preference Question
        rag_questions.append({
            "id": "rag_diy_preference",
            "category": "LABOR COSTS",
            "question": "Will you do any work yourself or hire professionals for everything?",
            "reason": "DIY can save 30-50% on labor but voids warranties and may affect insurance. Some work requires licensed professionals",
            "type": "single_choice",
            "required": True,
            "options": [
                {"value": "full_professional", "label": "Full Professional Installation", "description": "Licensed contractors for all work", "costImpact": "high"},
                {"value": "finishing_diy", "label": "DIY Finishing Only", "description": "Pro plumbing/electrical, DIY paint/accessories", "costImpact": "medium"},
                {"value": "significant_diy", "label": "Significant DIY", "description": "DIY demo, tiling - pros for plumbing/electrical only", "costImpact": "low"},
                {"value": "full_diy", "label": "Full DIY (except permits)", "description": "Maximum savings, requires skills", "costImpact": "low"}
            ],
            "expertHint": "German law requires licensed professionals for gas and main electrical work. DIY plumbing may void insurance"
        })

        return rag_questions
