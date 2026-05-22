from django.urls import path
from .views import ContractorListView

app_name = "contractors"

urlpatterns = [
	path("contractors/", ContractorListView.as_view(), name="contractor-list"),
]

