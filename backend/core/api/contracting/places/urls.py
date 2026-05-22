"""
URL Configuration for Google Places API endpoints
"""

from django.urls import path
from . import views

app_name = "places"

urlpatterns = [
    path('search-contractors/', views.search_contractors, name='search-contractors'),
    path('derive-roles/', views.derive_roles, name='derive-roles'),
    path('geocode/', views.geocode_address, name='geocode'),
    path('invalidate-cache/', views.invalidate_cache, name='invalidate-cache'),
]
