from django.urls import path
from .contracting_planning_create_view import ContractingPlanningCreateView
from .contracting_planning_detail_view import ContractingPlanningDetailView
from .contracting_planning_answer_view import ContractingPlanningAnswerView
from .contracting_planning_invitation_view import ContractingPlanningInvitationView
from .contracting_planning_pdf_view import ContractingPlanningPDFView
from .contracting_planning_modify_email_view import ContractingPlanningModifyEmailView
from .send_invitations_view import SendInvitationsView
from .contractor_list_view import ContractorListView
from .conversation_list_view import ConversationListView
from .conversation_messages_view import ConversationMessagesView
from .mark_messages_read_view import MarkMessagesReadView
from .update_step_view import UpdateStepView
from .action_views import ApproveActionView, RejectActionView, ModifyActionView
from .offer_views import (
	OfferListView,
	OfferDetailView,
	AnalyzeOfferView,
	CompareOffersView,
	OfferAnalysisDetailView,
	StructuredComparisonView,
	AnalysisDetailView
)
from .import_from_planning_view import ImportFromPlanningView
from .contractor_matching_views import (
	enrich_contractor,
	generate_why_match,
	generate_risk_flags,
	generate_coverage_guidance
)

app_name = "contracting"

urlpatterns = [
	# Planning endpoints
	path('planning/', ContractingPlanningCreateView.as_view(), name='contracting-planning-create'),
	path('planning/<int:project_id>/', ContractingPlanningDetailView.as_view(), name='contracting-planning-detail'),
	path('planning/<int:project_id>/answers/', ContractingPlanningAnswerView.as_view(), name='contracting-planning-answers'),
	path('planning/<int:project_id>/step/', UpdateStepView.as_view(), name='contracting-planning-update-step'),
	path('planning/<int:project_id>/invitation/', ContractingPlanningInvitationView.as_view(), name='contracting-planning-invitation'),
	path('planning/<int:project_id>/invitation/modify/', ContractingPlanningModifyEmailView.as_view(), name='contracting-planning-modify-email'),
	path('planning/<int:project_id>/invitation/send/', SendInvitationsView.as_view(), name='contracting-planning-send-invitations'),
	path('planning/<int:project_id>/pdf/', ContractingPlanningPDFView.as_view(), name='contracting-planning-pdf'),
	# Import planning data (Planning -> Contracting)
	path('planning/<int:project_id>/import-from-planning/', ImportFromPlanningView.as_view(), name='contracting-planning-import'),
	
	# Contractor endpoints
	path('contractors/', ContractorListView.as_view(), name='contractor-list'),
	
	# Contractor Matching AI endpoints
	path('enrich-contractor/', enrich_contractor, name='enrich-contractor'),
	path('generate-why-match/', generate_why_match, name='generate-why-match'),
	path('generate-risk-flags/', generate_risk_flags, name='generate-risk-flags'),
	path('generate-coverage-guidance/', generate_coverage_guidance, name='generate-coverage-guidance'),
	
	# Conversation endpoints
	path('planning/<int:project_id>/conversations/', ConversationListView.as_view(), name='conversation-list'),
	path('planning/<int:project_id>/conversations/<int:contractor_id>/messages/', ConversationMessagesView.as_view(), name='conversation-messages'),
	path('planning/<int:project_id>/conversations/<int:contractor_id>/mark-read/', MarkMessagesReadView.as_view(), name='conversation-mark-read'),
	
	# Action endpoints
	path('planning/<int:project_id>/conversations/<int:contractor_id>/actions/<int:action_id>/approve/', ApproveActionView.as_view(), name='action-approve'),
	path('planning/<int:project_id>/conversations/<int:contractor_id>/actions/<int:action_id>/reject/', RejectActionView.as_view(), name='action-reject'),
	path('planning/<int:project_id>/conversations/<int:contractor_id>/actions/<int:action_id>/modify/', ModifyActionView.as_view(), name='action-modify'),
	
	# Offer endpoints
	path('planning/<int:project_id>/offers/', OfferListView.as_view(), name='offer-list'),
	path('planning/<int:project_id>/offers/<int:offer_id>/', OfferDetailView.as_view(), name='offer-detail'),
	path('planning/<int:project_id>/offers/<int:offer_id>/analyze/', AnalyzeOfferView.as_view(), name='offer-analyze'),
	path('planning/<int:project_id>/offers/<int:offer_id>/analysis/', OfferAnalysisDetailView.as_view(), name='offer-analysis-detail'),
	path('planning/<int:project_id>/offers/compare/', CompareOffersView.as_view(), name='offers-compare'),
	path('planning/<int:project_id>/offers/comparison-dashboard/', StructuredComparisonView.as_view(), name='offers-comparison-dashboard'),
	
	# Analysis endpoints
	path('planning/<int:project_id>/analyses/<int:analysis_id>/', AnalysisDetailView.as_view(), name='analysis-detail'),
]

