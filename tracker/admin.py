from django.contrib import admin
from .models import Application, Note


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'job_title', 'status',
                    'application_date', 'user', 'created_at']
    list_filter = ['status', 'application_date', 'created_at']
    search_fields = ['company_name', 'job_title', 'contact_info', 'email']
    date_hierarchy = 'application_date'
    ordering = ['-application_date']

    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'company_name', 'job_title', 'status')
        }),
        ('Application Details', {
            'fields': ('application_date', 'method', 'contact_info', 'email')
        }),
        ('Additional Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['title', 'application', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['title', 'body', 'application__company_name']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

    fieldsets = (
        ('Note Information', {
            'fields': ('application', 'title', 'body')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at', 'updated_at']
