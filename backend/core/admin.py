from django.contrib import admin
from .models import Project, Contractor, ContractingPlanning, ContractingPlanningFile, Message, MessageAction, MessageAttachment, RenovationPlan, FinancingResult


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
	list_display = ("id", "name")


@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
	list_display = ("id", "name", "city", "state", "rating")
	list_filter = ("kfw_eligible", "state")
	search_fields = ("name", "city", "email", "project_types")


class ContractingPlanningFileInline(admin.TabularInline):
	model = ContractingPlanningFile
	extra = 0
	readonly_fields = ('uploaded_at',)


@admin.register(ContractingPlanning)
class ContractingPlanningAdmin(admin.ModelAdmin):
	list_display = ("id", "project", "current_step", "created_at", "updated_at")
	list_filter = ("current_step", "created_at", "updated_at")
	search_fields = ("project__name", "description")
	readonly_fields = ("created_at", "updated_at")
	inlines = [ContractingPlanningFileInline]


@admin.register(ContractingPlanningFile)
class ContractingPlanningFileAdmin(admin.ModelAdmin):
	list_display = ("id", "contracting_planning", "filename", "uploaded_at")
	list_filter = ("uploaded_at",)
	search_fields = ("filename", "contracting_planning__project__name")
	readonly_fields = ("uploaded_at",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
	list_display = ("id", "contracting_planning", "contractor_id", "sender", "message_type", "timestamp")
	list_filter = ("sender", "message_type", "timestamp")
	search_fields = ("content", "contracting_planning__project__name")
	readonly_fields = ("timestamp",)
	ordering = ("-timestamp",)


@admin.register(MessageAction)
class MessageActionAdmin(admin.ModelAdmin):
	list_display = ("id", "message", "action_type", "action_status", "created_at", "updated_at")
	list_filter = ("action_type", "action_status", "created_at")
	search_fields = ("action_summary",)
	readonly_fields = ("created_at", "updated_at")
	ordering = ("-created_at",)


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
	list_display = ("id", "message", "filename", "content_type", "file_size", "uploaded_at")
	list_filter = ("content_type", "uploaded_at")
	search_fields = ("filename", "message__content")
	readonly_fields = ("uploaded_at",)
	ordering = ("-uploaded_at",)



@admin.register(RenovationPlan)
class RenovationPlanAdmin(admin.ModelAdmin):
    list_display = ['id', 'plan_name', 'user', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FinancingResult)
class FinancingResultAdmin(admin.ModelAdmin):
	list_display = ("id", "result_name", "renovation_type", "total_estimated_cost", "user_identifier", "created_at", "rag_enabled")
	list_filter = ("renovation_type", "rag_enabled", "created_at")
	search_fields = ("result_name", "user_identifier", "property_location", "notes")
	readonly_fields = ("created_at", "updated_at")
	ordering = ("-created_at",)

	fieldsets = (
		("Basic Information", {
			"fields": ("renovation_type", "property_location", "result_name", "user_identifier")
		}),
		("Cost Estimate", {
			"fields": ("total_estimated_cost", "cost_breakdown", "cost_explanation")
		}),
		("Financing Options", {
			"fields": ("financing_options", "financing_summary"),
			"classes": ("collapse",)
		}),
		("Image & Visualization", {
			"fields": ("image_base64", "image_prompt"),
			"classes": ("collapse",)
		}),
		("RAG Analysis", {
			"fields": ("rag_enabled", "rag_metadata"),
			"classes": ("collapse",)
		}),
		("Form Data", {
			"fields": ("form_data",),
			"classes": ("collapse",)
		}),
		("User Notes", {
			"fields": ("notes",),
		}),
		("Timestamps", {
			"fields": ("created_at", "updated_at"),
		}),
	)


