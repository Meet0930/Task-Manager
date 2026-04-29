from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.mail import send_mail
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Task, OTPVerification

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "password_confirm")
        extra_kwargs = {
            "email": {"required": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        validated_data["email"] = validated_data["email"].lower()
        user = User.objects.create_user(password=password, is_active=False, **validated_data)

        # Generate OTP and send email
        otp_code = OTPVerification.generate_otp(user.email)
        send_mail(
            "Verify your Task Manager account",
            f"Your verification code is: {otp_code}\nThis code will expire in 10 minutes.",
            None,
            [user.email],
            fail_silently=False,
        )
        return user


class TaskSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")
    assigned_by = serializers.ReadOnlyField(source="assigned_by.username")

    class Meta:
        model = Task
        fields = (
            "id",
            "user",
            "assigned_by",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "created_at",
        )
        read_only_fields = ("id", "user", "assigned_by", "created_at")

    def validate_due_date(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("due_date must be in the future.")
        return value


class AdminTaskSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")
    owner_id = serializers.IntegerField(source="user.id", read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(source="user", queryset=User.objects.all(), write_only=True)
    assigned_by = serializers.ReadOnlyField(source="assigned_by.username")

    class Meta:
        model = Task
        fields = (
            "id",
            "user",
            "owner_id",
            "user_id",
            "assigned_by",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "created_at",
        )
        read_only_fields = ("id", "user", "owner_id", "assigned_by", "created_at")

    def validate_due_date(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("due_date must be in the future.")
        return value


class TaskStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task.Status.choices)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class DashboardSummarySerializer(serializers.Serializer):
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    pending_tasks = serializers.IntegerField()


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "is_staff")


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = CurrentUserSerializer(self.user).data
        return data

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)

    def validate(self, attrs):
        email = attrs.get("email")
        otp_code = attrs.get("otp_code")
        otp_obj = OTPVerification.verify_otp(email, otp_code)
        if otp_obj is None:
            raise serializers.ValidationError({"otp_code": "Invalid OTP code."})
        return attrs

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value.lower()

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8)

    def validate_email(self, value):
        if not User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value.lower()
    
    def validate(self, attrs):
        email = attrs.get("email")
        otp_code = attrs.get("otp_code")
        otp_obj = OTPVerification.verify_otp(email, otp_code)
        if otp_obj is None:
            raise serializers.ValidationError({"otp_code": "Invalid OTP code."})
        return attrs

from .models import ChatMessage
class ChatMessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'user', 'username', 'content', 'created_at']
        read_only_fields = ['user', 'created_at']
