from django.shortcuts import render


def home_view(request):
    return render(request, "home.html", {"page_name": "home"})


def login_view(request):
    return render(request, "auth/login.html", {"page_name": "login"})


def register_view(request):
    return render(request, "auth/register.html", {"page_name": "register"})


def verify_otp_view(request):
    return render(request, "auth/verify_otp.html", {"page_name": "verify-otp"})


def forgot_password_view(request):
    return render(request, "auth/forgot_password.html", {"page_name": "forgot-password"})


def dashboard_view(request):
    return render(request, "dashboard.html", {"page_name": "dashboard"})


from .models import Task

def manager_dashboard_view(request):
    user_count = Task.objects.values('user').distinct().count()
    return render(request, "manager_dashboard.html", {"page_name": "manager", "user_count": user_count})


def logout_view(request):
    return render(request, "home.html", {"page_name": "home"})
