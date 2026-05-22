from django.urls import path
from . import views

app_name = 'renovation'

urlpatterns = [
    path(
        'generate-plan/',
        views.generate_renovation_plan,
        name='generate_plan'
    ),
    
    path(
        'next-question/',
        views.generate_next_question,
        name='generate_next_question'
    ),

    path(
        'building-types/',
        views.get_building_types,
        name='building_types'
    ),
    
    path(
        'renovation-types/',
        views.get_renovation_types,
        name='renovation_types'
    ),
    
    path(
        'health/',
        views.api_health_check,
        name='health_check'
    ),
    
    path(
        'plans/',
        views.get_renovation_plans,
        name='get_plans'
    ),
    
    path(
        'plans/project/<int:project_id>/',
        views.get_renovation_plan_by_project,
        name='get_plan_by_project'
    ),
    
]