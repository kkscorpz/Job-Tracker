from django.urls import path
from . import views

urlpatterns = [
    # Page views
    path('', views.dashboard, name='dashboard'),
    path('register/', views.register, name='register'),
    path('notes/', views.notes, name='notes'),
    path('analytics/', views.analytics, name='analytics'),
    path('settings/', views.settings, name='settings'),

    # API endpoints for applications
    path('api/applications/', views.get_applications, name='get_applications'),
    path('api/applications/add/', views.add_application, name='add_application'),
    path('api/applications/<int:application_id>/delete/',
         views.delete_application, name='delete_application'),

    # API endpoints for notes
    path('api/applications/<int:application_id>/notes/',
         views.get_application_notes, name='get_application_notes'),
    path('api/applications/<int:application_id>/notes/add/',
         views.add_note, name='add_note'),
    path('api/applications/<int:application_id>/notes/<int:note_id>/update/',
         views.update_note, name='update_note'),
    path('api/applications/<int:application_id>/notes/<int:note_id>/delete/',
         views.delete_note, name='delete_note'),
]
