from django.conf import settings
from django.db import models
from django.utils import timezone
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.core.mail import send_mail
import random

class OTPVerification(models.Model):
    email = models.EmailField(unique=True)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        # OTP is valid for 10 minutes
        return timezone.now() < self.created_at + timezone.timedelta(minutes=10)

    @classmethod
    def generate_otp(cls, email):
        email = email.strip().lower()
        code = f"{random.randint(100000, 999999)}"
        obj, created = cls.objects.update_or_create(
            email=email,
            defaults={"otp_code": code, "created_at": timezone.now()}
        )
        return code

    @classmethod
    def verify_otp(cls, email, otp_code):
        email = email.strip().lower()
        try:
            otp_obj = cls.objects.get(email__iexact=email, otp_code=otp_code)
        except cls.DoesNotExist:
            return None
        if not otp_obj.is_valid():
            return None
        return otp_obj

    @classmethod
    def consume_otp(cls, email, otp_code):
        otp_obj = cls.verify_otp(email, otp_code)
        if otp_obj:
            otp_obj.delete()
        return otp_obj

class Task(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_tasks",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    due_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "priority"]),
            models.Index(fields=["user", "due_date"]),
            models.Index(fields=["assigned_by", "created_at"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.user})"

@receiver(pre_save, sender=Task)
def notify_task_status_change(sender, instance, **kwargs):
    if instance.id:
        try:
            old_task = Task.objects.get(id=instance.id)
            if old_task.status != instance.status:
                user = instance.user
                if instance.status == Task.Status.COMPLETED:
                    subject = "Your Task is Complete"
                    message = f"Hello {user.username},\n\nYour task '{instance.title}' is now marked as complete.\n\nThank you!"
                else:
                    subject = "Your Task is Pending"
                    message = f"Hello {user.username},\n\nYour task '{instance.title}' is now pending.\n\nThank you!"
                
                send_mail(
                    subject,
                    message,
                    None,
                    [user.email],
                    fail_silently=False,
                )
        except Task.DoesNotExist:
            pass

@receiver(post_save, sender=Task)
def notify_task_assignment(sender, instance, created, **kwargs):
    if created and instance.assigned_by and instance.assigned_by != instance.user:
        user = instance.user
        subject = "New Task Assigned"
        message = f"Hello {user.username},\n\nA new task '{instance.title}' has been assigned to you by {instance.assigned_by.username}.\n\nThank you!"
        send_mail(
            subject,
            message,
            None,
            [user.email],
            fail_silently=False,
        )

class ChatMessage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
