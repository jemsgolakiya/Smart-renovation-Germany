from django.urls import path
from .views import (
	login_view,
	logout_view,
	register_view,
	current_user_view,
	auth_status_view,
	get_csrf_token,
)

urlpatterns = [
	path("auth/csrf/", get_csrf_token, name="get-csrf-token"),
	path("auth/login/", login_view, name="login"),
	path("auth/logout/", logout_view, name="logout"),
	path("auth/register/", register_view, name="register"),
	path("auth/user/", current_user_view, name="current-user"),
	path("auth/status/", auth_status_view, name="auth-status"),
]

