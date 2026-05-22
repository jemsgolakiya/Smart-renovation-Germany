from django.urls import path
from .views import ChatbotMessageView, ExtractAndGeneratePlanView


urlpatterns = [
	path("message/", ChatbotMessageView.as_view(), name="chatbot-message"),
    path("generate-from-chat/", ExtractAndGeneratePlanView.as_view(), name="generate-from-chat"),
]
