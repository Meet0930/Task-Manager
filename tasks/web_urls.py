from django.urls import path

from .web_views import (
    dashboard_view,
    forgot_password_view,
    login_view,
    logout_view,
    manager_dashboard_view,
    register_view,
    verify_otp_view,
)


urlpatterns = [
    path("login/", login_view, name="login-page"),
    path("register/", register_view, name="register-page"),
    path("verify-otp/", verify_otp_view, name="verify-otp-page"),
    path("forgot-password/", forgot_password_view, name="forgot-password-page"),
    path("logout/", logout_view, name="logout-page"),
    path("dashboard/", dashboard_view, name="dashboard"),
    path("manager/", manager_dashboard_view, name="manager-dashboard"),
]
