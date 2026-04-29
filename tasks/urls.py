from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminTaskAssignmentViewSet, AdminUserListView, CurrentUserView, DashboardView, 
    LoginView, LogoutView, RegisterViewSet, TaskViewSet,
    VerifyOTPView, ForgotPasswordView, ResetPasswordView,
    ChatMessageViewSet
)


router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"admin/tasks", AdminTaskAssignmentViewSet, basename="admin-task")
router.register(r"register", RegisterViewSet, basename="register")
router.register(r"chat", ChatMessageViewSet, basename="chat")


class LoginNoSlashView(LoginView):
    schema = None


class RegisterNoSlashView(RegisterViewSet):
    schema = None


from rest_framework_simplejwt.views import TokenRefreshView

class TaskNoSlashView(TaskViewSet):
    schema = None

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("login", LoginNoSlashView.as_view(), name="login-no-slash"),
    path("verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", CurrentUserView.as_view(), name="me"),
    path("admin/users/", AdminUserListView.as_view(), name="admin-users"),
    path("register", RegisterNoSlashView.as_view({"post": "create"}), name="register-no-slash"),
    path("tasks", TaskNoSlashView.as_view({"get": "list", "post": "create"}), name="task-list-no-slash"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("dashboard/summary/", DashboardView.as_view(), name="dashboard-summary"),
    path("", include(router.urls)),
]
