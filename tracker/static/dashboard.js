// Get CSRF token for Django
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

// Store applications in memory
let applications = [];

// Load applications from server
async function loadApplications() {
    try {
        const response = await fetch('/api/applications/');
        const data = await response.json();
        applications = data.applications;
        renderApplicationCards();
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

// Generate dynamic calendar
function generateCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    
    document.querySelector('.calendar-header h2').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.innerHTML = '';
    
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell empty';
        calendarGrid.appendChild(emptyCell);
    }
    
    const today = now.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        const dayOfWeek = (firstDay + day - 1) % 7;
        
        if (dayOfWeek === 6) {
            dayCell.className = 'calendar-cell saturday';
        } else {
            dayCell.className = 'calendar-cell';
        }
        
        if (day === today) {
            dayCell.style.backgroundColor = '#e8f5e9';
            dayCell.style.fontWeight = 'bold';
            dayCell.style.border = '2px solid #1b5e20';
        }
        
        dayCell.textContent = day;
        calendarGrid.appendChild(dayCell);
    }
    
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remainingCells; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell empty';
        if ((firstDay + daysInMonth + i) % 7 === 6) {
            emptyCell.classList.add('saturday');
        }
        calendarGrid.appendChild(emptyCell);
    }
}

// Open Modal
function openModal() {
    document.getElementById("addAppModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

// Close Modal
function closeModal() {
    document.getElementById("addAppModal").style.display = "none";
    document.body.style.overflow = "auto";
}

// Close modal when clicking outside
document.getElementById("addAppModal").addEventListener("click", function (e) {
    if (e.target === this) {
        closeModal();
    }
});

// Handle form submission
document.getElementById("applicationForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = {
        companyName: document.getElementById("companyName").value,
        jobTitle: document.getElementById("jobTitle").value,
        applicationDate: document.getElementById("applicationDate").value,
        method: document.getElementById("method").value,
        contactInfo: document.getElementById("contactInfo").value,
        status: document.getElementById("status").value,
        email: document.getElementById("email").value,
        notes: document.getElementById("notes").value,
    };

    try {
        // Save application first
        const response = await fetch('/api/applications/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (data.success) {
            const applicationId = data.application_id;
            
            // If there are notes, automatically create a note
            if (formData.notes && formData.notes.trim() !== '') {
                try {
                    await fetch(`/api/applications/${applicationId}/notes/add/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': csrftoken
                        },
                        body: JSON.stringify({
                            title: 'Application Notes',
                            body: formData.notes
                        })
                    });
                } catch (noteError) {
                    console.error('Error creating note:', noteError);
                    // Continue anyway since application was saved
                }
            }
            
            await loadApplications();
            closeModal();
            this.reset();
        } else {
            alert('Error saving application: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving application');
    }
});

// Delete application function
async function deleteApplication(id) {
    if (confirm("Are you sure you want to delete this application?")) {
        try {
            const response = await fetch(`/api/applications/${id}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });

            const data = await response.json();
            
            if (data.success) {
                await loadApplications();
            } else {
                alert('Error deleting application: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting application');
        }
    }
}

// Render application cards
function renderApplicationCards() {
    const container = document.getElementById("applicationCards");
    container.innerHTML = "";

    applications.forEach((app) => {
        const card = document.createElement("div");
        card.className = "app-card";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-card";
        deleteBtn.innerHTML = "×";
        deleteBtn.title = "Delete";
        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            deleteApplication(app.id);
        };

        const companyName = document.createElement("h3");
        companyName.className = "company-name";
        companyName.textContent = app.companyName;

        const appStatus = document.createElement("p");
        appStatus.className = "app-status";
        appStatus.textContent = app.status;

        const appType = document.createElement("p");
        appType.className = "app-type";
        appType.textContent = app.method || "N/A";

        card.appendChild(deleteBtn);
        card.appendChild(companyName);
        card.appendChild(appStatus);
        card.appendChild(appType);

        // Make card clickable to view notes
        card.style.cursor = 'pointer';
        card.onclick = function(e) {
            // Don't navigate if clicking the delete button
            if (!e.target.classList.contains('delete-card')) {
                window.location.href = `/notes/?app=${app.id}`;
            }
        };

        container.appendChild(card);
    });

    // Always show at least 3 empty slots if we have less than 3 apps
    const emptyCardsCount = Math.max(0, 3 - applications.length);
    for (let i = 0; i < emptyCardsCount; i++) {
        const emptyCard = document.createElement("div");
        emptyCard.className = "app-card empty-card";
        container.appendChild(emptyCard);
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
    generateCalendar();
    loadApplications();
    
    setInterval(generateCalendar, 60000);
});