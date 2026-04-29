from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.generics import GenericAPIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view

from django.core.mail import send_mail
from rest_framework import views

from .filters import TaskFilter
from .models import Task, OTPVerification
from .serializers import (
    AdminTaskSerializer,
    CurrentUserSerializer,
    DashboardSummarySerializer,
    CustomTokenObtainPairSerializer,
    LogoutSerializer,
    TaskSerializer,
    TaskStatusSerializer,
    UserRegistrationSerializer,
    VerifyOTPSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

User = get_user_model()


@extend_schema(
    tags=["Auth"],
    summary="Register a new account",
    description="Create a new user account using username, email, password, and password confirmation.",
    examples=[
        OpenApiExample(
            "Register request",
            value={
                "username": "alice",
                "email": "alice@example.com",
                "password": "Password123!",
                "password_confirm": "Password123!",
            },
            request_only=True,
        ),
    ],
)
class RegisterViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        otp_code = OTPVerification.generate_otp(user.email)
        send_mail(
            "Account Verification",
            f"Your verification code is: {otp_code}\nThis code will expire in 10 minutes.",
            None,
            [user.email],
            fail_silently=False,
        )

        return Response(
            {
                "message": "User registered successfully. Please verify your email with the OTP sent.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
            },
            status=status.HTTP_201_CREATED,
        )

class VerifyOTPView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        otp_code = serializer.validated_data["otp_code"]
        
        try:
            user = User.objects.get(email__iexact=email)
            if not user.is_active:
                user.is_active = True
                user.save(update_fields=["is_active"])
            OTPVerification.consume_otp(email, otp_code)
            
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Email verified successfully.",
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

class ForgotPasswordView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        
        otp_code = OTPVerification.generate_otp(email)
        send_mail(
            "Password Reset Request",
            f"Your password reset code is: {otp_code}\nThis code will expire in 10 minutes.",
            None,
            [email],
            fail_silently=False,
        )
        return Response({"message": "Password reset OTP sent to email."})

class ResetPasswordView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        otp_code = serializer.validated_data["otp_code"]
        new_password = serializer.validated_data["new_password"]
        
        user = User.objects.get(email__iexact=email)
        user.set_password(new_password)
        user.save()
        OTPVerification.consume_otp(email, otp_code)
        
        return Response({"message": "Password has been reset successfully."})


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    @extend_schema(
        tags=["Auth"],
        summary="Login and get JWT tokens",
        description="Provide username and password to receive access and refresh tokens.",
        examples=[
            OpenApiExample(
                "Login request",
                value={"username": "alice", "password": "Password123!"},
                request_only=True,
            ),
            OpenApiExample(
                "Login response",
                value={
                    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                },
                response_only=True,
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    permission_classes = [AllowAny]
    authentication_classes = []


class CurrentUserView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CurrentUserSerializer

    def get(self, request):
        return Response(self.get_serializer(request.user).data)


class AdminUserListView(GenericAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CurrentUserSerializer

    def get(self, request):
        users = User.objects.order_by("username")
        return Response(self.get_serializer(users, many=True).data)


@extend_schema(
    tags=["Auth"],
    summary="Logout current user",
    description="Blacklist the provided refresh token so it can no longer be used.",
)
class LogoutView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh = RefreshToken(serializer.validated_data["refresh"])
        refresh.blacklist()
        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Dashboard"],
    summary="Get task summary for current user",
    description="Returns the total, completed, and pending task counts for the logged-in user.",
)
class DashboardView(GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DashboardSummarySerializer

    def get(self, request):
        tasks = Task.objects.filter(user=request.user)
        stats = tasks.aggregate(
            total_tasks=Count("id"),
            completed_tasks=Count("id", filter=Q(status=Task.Status.COMPLETED)),
            pending_tasks=Count("id", filter=Q(status=Task.Status.PENDING)),
        )
        serializer = self.get_serializer(stats)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(tags=["Tasks"], summary="List my tasks", description="Returns only the authenticated user's tasks."),
    create=extend_schema(tags=["Tasks"], summary="Create a task", description="Create a new task for the authenticated user."),
    update=extend_schema(tags=["Tasks"], summary="Update a task", description="Update a task owned by the authenticated user."),
    partial_update=extend_schema(tags=["Tasks"], summary="Partially update a task", description="Update selected task fields."),
    destroy=extend_schema(tags=["Tasks"], summary="Delete a task", description="Delete a task owned by the authenticated user."),
)
class TaskViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Task.objects.none()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = TaskFilter
    search_fields = ["title"]
    ordering_fields = ["due_date", "created_at"]
    ordering = ["-created_at"]
    lookup_value_converter = "int"

    def get_queryset(self):
        # drf-spectacular may inspect this view with a fake request during schema generation.
        if getattr(self, "swagger_fake_view", False):
            return Task.objects.none()
        return Task.objects.filter(user=self.request.user).select_related("user", "assigned_by")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, assigned_by=self.request.user)

    @extend_schema(
        tags=["Tasks"],
        summary="Mark task as completed",
        description="Convenience endpoint to change task status to completed.",
    )
    @action(detail=True, methods=["patch"], url_path="mark-completed")
    def mark_completed(self, request, pk=None):
        task = self.get_object()
        serializer = TaskStatusSerializer(data={"status": Task.Status.COMPLETED})
        serializer.is_valid(raise_exception=True)
        task.status = serializer.validated_data["status"]
        task.save(update_fields=["status"])
        return Response(self.get_serializer(task).data, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(tags=["Admin"], summary="List all tasks", description="Admin-only endpoint to view every task in the system."),
    create=extend_schema(tags=["Admin"], summary="Assign a task", description="Admin-only endpoint to assign a task to a user."),
    update=extend_schema(tags=["Admin"], summary="Edit any task", description="Admin-only endpoint to update any task."),
    partial_update=extend_schema(tags=["Admin"], summary="Partially edit any task", description="Admin-only endpoint to patch any task."),
    destroy=extend_schema(tags=["Admin"], summary="Delete any task", description="Admin-only endpoint to remove any task."),
)
class AdminTaskAssignmentViewSet(
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Task.objects.select_related("user", "assigned_by")
    serializer_class = AdminTaskSerializer
    permission_classes = [IsAdminUser]
    filterset_class = TaskFilter
    search_fields = ["title"]
    ordering_fields = ["due_date", "created_at", "user__username"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if not self.request.user.is_staff:
            return Task.objects.none()
        return super().get_queryset()

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)

from .models import ChatMessage
from .serializers import ChatMessageSerializer

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all().select_related('user')
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
