from django.urls import path
from .views import (
	CostEstimationView,
	MultimodalCostEstimationView,
	FinancingOptionsView,
	ImageGenerationView,
	AIChatView,
	SaveFinancingResultView,
	FinancingResultsListView,
	FinancingResultDetailView,
	SmartPhotoAnalysisView,
)


urlpatterns = [
	path("financing/cost-estimate/", CostEstimationView.as_view(), name="financing-cost-estimate"),
	path("financing/multimodal-cost-estimate/", MultimodalCostEstimationView.as_view(), name="multimodal-cost-estimate"),
	path("financing/financing-options/", FinancingOptionsView.as_view(), name="financing-options"),
	path("financing/image-generation/", ImageGenerationView.as_view(), name="image-generation"),
	path("financing/ai-chat/", AIChatView.as_view(), name="financing-ai-chat"),

	# Smart Photo Analysis - Analyzes photos and generates dynamic questions
	path("financing/smart-photo-analysis/", SmartPhotoAnalysisView.as_view(), name="smart-photo-analysis"),

	# Saved Results endpoints
	path("financing/results/save/", SaveFinancingResultView.as_view(), name="financing-save-result"),
	path("financing/results/", FinancingResultsListView.as_view(), name="financing-list-results"),
	path("financing/results/<int:result_id>/", FinancingResultDetailView.as_view(), name="financing-result-detail"),
]
