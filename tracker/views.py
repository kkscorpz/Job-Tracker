from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Application, Note
from .forms import RegisterForm
import json


@login_required
def dashboard(request):
    applications = Application.objects.filter(user=request.user)
    return render(request, 'dashboard.html', {'applications': applications})


def register(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('dashboard')
    else:
        form = RegisterForm()

    return render(request, 'registration/register.html', {'form': form})


@login_required
def notes(request):
    applications = Application.objects.filter(user=request.user)
    return render(request, 'notes.html', {'applications': applications})


@login_required
def analytics(request):
    return render(request, 'analytics.html')


@login_required
def settings(request):
    return render(request, 'settings.html')


# API Endpoints for Applications
@login_required
def get_applications(request):
    applications = Application.objects.filter(user=request.user)
    apps_list = [{
        'id': app.id,
        'companyName': app.company_name,
        'jobTitle': app.job_title,
        'status': app.status,
        'method': app.method,
    } for app in applications]
    return JsonResponse({'applications': apps_list})


@login_required
@require_http_methods(["POST"])
def add_application(request):
    try:
        data = json.loads(request.body)

        application = Application.objects.create(
            user=request.user,
            company_name=data.get('companyName'),
            job_title=data.get('jobTitle'),
            application_date=data.get('applicationDate'),
            method=data.get('method', ''),
            contact_info=data.get('contactInfo', ''),
            status=data.get('status', 'Applied'),
            email=data.get('email', ''),
            notes=data.get('notes', '')
        )

        # Automatically create a note if notes field has content
        notes_content = data.get('notes', '').strip()
        if notes_content:
            Note.objects.create(
                application=application,
                title=data.get('companyName'),
                body=notes_content
            )

        return JsonResponse({
            'success': True,
            'application_id': application.id,  # Added this for frontend
            'application': {
                'id': application.id,
                'companyName': application.company_name,
                'jobTitle': application.job_title,
                'status': application.status,
                'method': application.method,
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["DELETE"])
def delete_application(request, application_id):
    try:
        application = get_object_or_404(
            Application, id=application_id, user=request.user)
        application.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


# API Endpoints for Notes
@login_required
def get_application_notes(request, application_id):
    application = get_object_or_404(
        Application, id=application_id, user=request.user)
    notes = application.application_notes.all()

    notes_list = [{
        'id': note.id,
        'title': note.title,
        'body': note.body,
        'createdAt': note.created_at.isoformat()
    } for note in notes]

    return JsonResponse({
        'application': {
            'id': application.id,
            'companyName': application.company_name,
            'jobTitle': application.job_title,
        },
        'notes': notes_list
    })


@login_required
@require_http_methods(["POST"])
def add_note(request, application_id):
    try:
        application = get_object_or_404(
            Application, id=application_id, user=request.user)
        data = json.loads(request.body)

        note = Note.objects.create(
            application=application,
            title=data.get('title'),
            body=data.get('body')
        )

        return JsonResponse({
            'success': True,
            'note': {
                'id': note.id,
                'title': note.title,
                'body': note.body,
                'createdAt': note.created_at.isoformat()
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["PUT"])
def update_note(request, application_id, note_id):
    try:
        application = get_object_or_404(
            Application, id=application_id, user=request.user)
        note = get_object_or_404(Note, id=note_id, application=application)
        data = json.loads(request.body)

        note.title = data.get('title', note.title)
        note.body = data.get('body', note.body)
        note.save()

        return JsonResponse({
            'success': True,
            'note': {
                'id': note.id,
                'title': note.title,
                'body': note.body,
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@require_http_methods(["DELETE"])
def delete_note(request, application_id, note_id):
    try:
        application = get_object_or_404(
            Application, id=application_id, user=request.user)
        note = get_object_or_404(Note, id=note_id, application=application)
        note.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
