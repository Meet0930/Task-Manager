from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "assigned_by", "status", "priority", "due_date", "created_at")
    list_filter = ("status", "priority", "created_at")
    search_fields = ("title", "description", "user__username", "user__email")
    ordering = ("-created_at",)
    actions = ("mark_completed", "mark_pending")

    @admin.action(description="Mark selected tasks as completed")
    def mark_completed(self, request, queryset):
        queryset.update(status=Task.Status.COMPLETED)

    @admin.action(description="Mark selected tasks as pending")
    def mark_pending(self, request, queryset):
        queryset.update(status=Task.Status.PENDING)
