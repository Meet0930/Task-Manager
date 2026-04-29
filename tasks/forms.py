from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.utils import timezone

from .models import Task

User = get_user_model()


class RegisterForm(UserCreationForm):
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={"class": "form-input", "placeholder": "you@example.com"})
    )

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "email", "password1", "password2")
        widgets = {
            "username": forms.TextInput(attrs={"class": "form-input", "placeholder": "Enter username"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ("username", "password1", "password2"):
            self.fields[field_name].widget.attrs.update({"class": "form-input"})

    def clean_email(self):
        email = self.cleaned_data["email"]
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("A user with this email already exists.")
        return email


class LoginForm(AuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(attrs={"class": "form-input", "placeholder": "Username"})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={"class": "form-input", "placeholder": "Password"})
    )


class TaskForm(forms.ModelForm):
    due_date = forms.DateTimeField(
        widget=forms.DateTimeInput(attrs={"type": "datetime-local", "class": "form-input"}),
        input_formats=["%Y-%m-%dT%H:%M"],
    )

    class Meta:
        model = Task
        fields = ("title", "description", "priority", "due_date")
        widgets = {
            "title": forms.TextInput(attrs={"class": "form-input", "placeholder": "Task title"}),
            "description": forms.Textarea(attrs={"class": "form-input", "rows": 3, "placeholder": "Optional details"}),
            "priority": forms.Select(attrs={"class": "form-input"}),
        }

    def clean_due_date(self):
        due_date = self.cleaned_data["due_date"]
        if due_date <= timezone.now():
            raise forms.ValidationError("Due date must be in the future.")
        return due_date


class AdminTaskForm(forms.ModelForm):
    due_date = forms.DateTimeField(
        widget=forms.DateTimeInput(attrs={"type": "datetime-local", "class": "form-input"}),
        input_formats=["%Y-%m-%dT%H:%M"],
    )

    class Meta:
        model = Task
        fields = ("user", "title", "description", "status", "priority", "due_date")
        widgets = {
            "user": forms.Select(attrs={"class": "form-input"}),
            "title": forms.TextInput(attrs={"class": "form-input", "placeholder": "Task title"}),
            "description": forms.Textarea(attrs={"class": "form-input", "rows": 3}),
            "status": forms.Select(attrs={"class": "form-input"}),
            "priority": forms.Select(attrs={"class": "form-input"}),
        }

    def clean_due_date(self):
        due_date = self.cleaned_data["due_date"]
        if due_date <= timezone.now():
            raise forms.ValidationError("Due date must be in the future.")
        return due_date
