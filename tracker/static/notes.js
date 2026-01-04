// Get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');

let applications = [];
let currentFolder = null;
let currentNotes = [];
let editingNoteId = null;

// Get DOM elements
const foldersView = document.getElementById('foldersView');
const notesDetailView = document.getElementById('notesDetailView');
const backButton = document.getElementById('backButton');
const currentFolderName = document.getElementById('currentFolderName');
const noteModal = document.getElementById('noteModal');
const saveNoteBtn = document.getElementById('saveNoteBtn');

// Load applications
async function loadApplications() {
    try {
        const response = await fetch('/api/applications/');
        const data = await response.json();
        applications = data.applications;
        renderFolders();
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

// Render static folders
function renderFolders() {
    const container = document.getElementById('applicationFolders');
    container.innerHTML = '';

    const folders = [
        { name: 'Application', color: 'blue', type: 'application' },
        { name: 'Work', color: 'yellow', type: 'work' },
        { name: 'Personal', color: 'gray', type: 'personal' }
    ];

    folders.forEach(folder => {
        const folderEl = document.createElement('div');
        folderEl.className = `note-folder note-${folder.color}`;
        folderEl.setAttribute('data-folder-type', folder.type);
        folderEl.innerHTML = `
            <div class="folder-header">
                <span class="folder-title">${folder.name}</span>
                <button class="folder-settings">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        `;
        
        folderEl.addEventListener('click', function(e) {
            if (!e.target.closest('.folder-settings')) {
                openFolder(folder.type, folder.name);
            }
        });
        
        container.appendChild(folderEl);
    });

    // Add new folder button
    const addFolder = document.createElement('div');
    addFolder.className = 'note-folder note-add';
    addFolder.innerHTML = `
        <button class="add-folder-btn">
            <i class="fas fa-plus"></i>
        </button>
    `;
    container.appendChild(addFolder);
}

// Open folder and load all notes from all applications
async function openFolder(folderType, folderName) {
    currentFolder = folderType;
    currentFolderName.textContent = folderName;
    currentNotes = [];
    
    if (folderType === 'application') {
        // Load notes from all applications
        try {
            for (const app of applications) {
                const response = await fetch(`/api/applications/${app.id}/notes/`);
                const data = await response.json();
                
                // Add application info to each note
                const notesWithAppInfo = data.notes.map(note => ({
                    ...note,
                    applicationId: app.id,
                    companyName: app.companyName,
                    jobTitle: app.jobTitle
                }));
                
                currentNotes = [...currentNotes, ...notesWithAppInfo];
            }
            
            renderNotes();
            foldersView.style.display = 'none';
            notesDetailView.style.display = 'block';
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    } else {
        // For Work and Personal folders (not yet implemented)
        renderNotes();
        foldersView.style.display = 'none';
        notesDetailView.style.display = 'block';
    }
}

// Render notes
function renderNotes() {
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = '';

    currentNotes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'individual-note';
        noteEl.setAttribute('data-note-id', note.id);
        noteEl.style.position = 'relative';
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-note';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            deleteNote(note.id, note.applicationId);
        };
        
        // Show company name and job title in the note
        const subtitle = note.companyName ? `<div style="font-size: 11px; color: #888; margin-top: 5px;">${note.companyName} - ${note.jobTitle}</div>` : '';
        
        noteEl.innerHTML = `
            <h3 class="note-title-text">${note.title}</h3>
            ${subtitle}
            <p class="note-body-text">${note.body || ''}</p>
        `;
        
        noteEl.prepend(deleteBtn);
        
        noteEl.addEventListener('click', function(e) {
            if (!e.target.classList.contains('delete-note')) {
                editingNoteId = note.id;
                editingApplicationId = note.applicationId;
                document.getElementById('noteTitle').value = note.title;
                document.getElementById('noteBody').value = note.body || '';
                document.getElementById('noteModalTitle').textContent = 'Edit Note';
                noteModal.style.display = 'block';
            }
        });

        notesGrid.appendChild(noteEl);
    });

    // Add new note button
    const addNote = document.createElement('div');
    addNote.className = 'individual-note note-add-individual';
    addNote.innerHTML = `
        <button class="add-note-individual-btn">
            <i class="fas fa-plus"></i>
        </button>
    `;
    
    addNote.addEventListener('click', function() {
        if (currentFolder === 'application' && applications.length === 0) {
            alert('No applications found. Please add an application first.');
            return;
        }
        
        editingNoteId = null;
        editingApplicationId = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteBody').value = '';
        document.getElementById('noteModalTitle').textContent = 'Create Note';
        
        // Show application selector if in application folder
        if (currentFolder === 'application') {
            showApplicationSelector();
        }
        
        noteModal.style.display = 'block';
    });
    
    notesGrid.appendChild(addNote);
}

// Show application selector for new notes
function showApplicationSelector() {
    const modalBody = document.querySelector('#noteModal .modal-body');
    
    // Check if selector already exists
    if (document.getElementById('applicationSelector')) {
        return;
    }
    
    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'form-group';
    selectorDiv.id = 'applicationSelector';
    selectorDiv.innerHTML = `
        <label for="selectApplication">Select Application</label>
        <select id="selectApplication" required>
            <option value="">Choose an application...</option>
            ${applications.map(app => `
                <option value="${app.id}">${app.companyName} - ${app.jobTitle}</option>
            `).join('')}
        </select>
    `;
    
    // Insert before title input
    modalBody.insertBefore(selectorDiv, modalBody.firstChild);
}

let editingApplicationId = null;

// Delete note function
async function deleteNote(noteId, applicationId) {
    if (confirm('Are you sure you want to delete this note?')) {
        try {
            const response = await fetch(`/api/applications/${applicationId}/notes/${noteId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });

            const data = await response.json();
            
            if (data.success) {
                // Reload notes
                await openFolder(currentFolder, currentFolderName.textContent);
            } else {
                alert('Error deleting note: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting note');
        }
    }
}

// Back button
backButton.addEventListener('click', function() {
    notesDetailView.style.display = 'none';
    foldersView.style.display = 'block';
    currentFolder = null;
    currentNotes = [];
});

// Close modal
document.querySelectorAll('.close-modal, .btn-cancel').forEach(btn => {
    btn.addEventListener('click', function() {
        noteModal.style.display = 'none';
        // Remove application selector if exists
        const selector = document.getElementById('applicationSelector');
        if (selector) {
            selector.remove();
        }
    });
});

window.addEventListener('click', function(event) {
    if (event.target === noteModal) {
        noteModal.style.display = 'none';
        // Remove application selector if exists
        const selector = document.getElementById('applicationSelector');
        if (selector) {
            selector.remove();
        }
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        noteModal.style.display = 'none';
        // Remove application selector if exists
        const selector = document.getElementById('applicationSelector');
        if (selector) {
            selector.remove();
        }
    }
});

// Save note
saveNoteBtn.addEventListener('click', async function() {
    const noteTitle = document.getElementById('noteTitle').value.trim();
    const noteBody = document.getElementById('noteBody').value.trim();
    
    if (noteTitle === '') {
        alert('Please enter note title');
        return;
    }

    let applicationId = editingApplicationId;
    
    // If creating new note in application folder, get selected application
    if (!editingNoteId && currentFolder === 'application') {
        const selectApp = document.getElementById('selectApplication');
        if (!selectApp || !selectApp.value) {
            alert('Please select an application');
            return;
        }
        applicationId = selectApp.value;
    }

    if (!applicationId) {
        alert('Please select an application');
        return;
    }

    try {
        let response;
        if (editingNoteId) {
            // Update existing note
            response = await fetch(`/api/applications/${applicationId}/notes/${editingNoteId}/update/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({ title: noteTitle, body: noteBody })
            });
        } else {
            // Create new note
            response = await fetch(`/api/applications/${applicationId}/notes/add/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({ title: noteTitle, body: noteBody })
            });
        }

        const data = await response.json();
        
        if (data.success) {
            // Reload all notes
            await openFolder(currentFolder, currentFolderName.textContent);
            
            noteModal.style.display = 'none';
            editingNoteId = null;
            editingApplicationId = null;
            
            // Remove application selector if exists
            const selector = document.getElementById('applicationSelector');
            if (selector) {
                selector.remove();
            }
        } else {
            alert('Error saving note: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving note');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadApplications();
});