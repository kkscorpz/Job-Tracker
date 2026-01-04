/**
 * Analytics Module
 * Handles data visualization and metrics calculation for job application tracking
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get CSRF token from cookies for Django
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value
 */
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

/**
 * Calculate time elapsed from a given date
 * @param {Date} date - The date to compare
 * @returns {string} Human-readable time elapsed
 */
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

const csrftoken = getCookie('csrftoken');
let applications = [];
const charts = {};

// Chart configuration constants
const CHART_COLORS = {
    primary: '#0d4715',
    secondary: '#1b5e20',
    applied: '#ff9800',
    interview: '#2196f3',
    offer: '#4caf50',
    rejected: '#f44336',
    gradient: ['#0d4715', '#1b5e20', '#2e7d32', '#388e3c', '#43a047', '#4caf50']
};

const STATUS_CONFIG = {
    'Applied': { icon: 'fa-paper-plane', color: '#ff9800', bg: '#fff3e0' },
    'Interview': { icon: 'fa-calendar-check', color: '#2196f3', bg: '#e3f2fd' },
    'Offer': { icon: 'fa-trophy', color: '#4caf50', bg: '#e8f5e9' },
    'Rejected': { icon: 'fa-times-circle', color: '#f44336', bg: '#ffebee' }
};

// ============================================================================
// DATA LOADING & FILTERING
// ============================================================================

/**
 * Load applications from API
 */
async function loadApplications() {
    try {
        const response = await fetch('/api/applications/');
        if (!response.ok) throw new Error('Failed to fetch applications');
        
        const data = await response.json();
        applications = data.applications || [];
        updateAnalytics();
    } catch (error) {
        console.error('Error loading applications:', error);
        showErrorState();
    }
}

/**
 * Filter applications by time range
 * @param {Array} apps - Applications array
 * @param {string|number} days - Number of days or 'all'
 * @returns {Array} Filtered applications
 */
function filterByTimeRange(apps, days) {
    if (days === 'all') return apps;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    return apps.filter(app => {
        const appDate = new Date(app.applicationDate);
        return appDate >= cutoffDate;
    });
}

// ============================================================================
// STATISTICS CALCULATIONS
// ============================================================================

/**
 * Calculate status counts from applications
 * @param {Array} apps - Applications array
 * @returns {Object} Status counts
 */
function calculateStatusCounts(apps) {
    const counts = {
        'Applied': 0,
        'Interview': 0,
        'Offer': 0,
        'Rejected': 0
    };
    
    apps.forEach(app => {
        if (counts.hasOwnProperty(app.status)) {
            counts[app.status]++;
        }
    });
    
    return counts;
}

/**
 * Calculate response rate percentage
 * @param {Object} statusCounts - Status counts object
 * @param {number} total - Total applications
 * @returns {number} Response rate percentage
 */
function calculateResponseRate(statusCounts, total) {
    if (total === 0) return 0;
    
    const responded = statusCounts['Interview'] + 
                     statusCounts['Offer'] + 
                     statusCounts['Rejected'];
    
    return Math.round((responded / total) * 100);
}

/**
 * Update statistics display
 * @param {Array} apps - Applications array
 */
function updateStats(apps) {
    const statusCounts = calculateStatusCounts(apps);
    const total = apps.length;
    const responseRate = calculateResponseRate(statusCounts, total);
    
    // Update DOM elements
    document.getElementById('totalApps').textContent = total;
    document.getElementById('pendingApps').textContent = statusCounts['Applied'];
    document.getElementById('interviewApps').textContent = statusCounts['Interview'];
    document.getElementById('offerApps').textContent = statusCounts['Offer'];
    document.getElementById('rejectedApps').textContent = statusCounts['Rejected'];
    document.getElementById('responseRate').textContent = `${responseRate}%`;
}

// ============================================================================
// CHART RENDERING
// ============================================================================

/**
 * Destroy existing chart if it exists
 * @param {string} chartName - Chart identifier
 */
function destroyChart(chartName) {
    if (charts[chartName]) {
        charts[chartName].destroy();
        charts[chartName] = null;
    }
}

/**
 * Create status distribution doughnut chart
 * @param {Array} apps - Applications array
 */
function updateStatusChart(apps) {
    const ctx = document.getElementById('statusChart');
    const statusCounts = calculateStatusCounts(apps);
    
    destroyChart('statusChart');
    
    charts.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Applied', 'Interview', 'Offer', 'Rejected'],
            datasets: [{
                data: [
                    statusCounts['Applied'],
                    statusCounts['Interview'],
                    statusCounts['Offer'],
                    statusCounts['Rejected']
                ],
                backgroundColor: [
                    CHART_COLORS.applied,
                    CHART_COLORS.interview,
                    CHART_COLORS.offer,
                    CHART_COLORS.rejected
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        font: { size: 13 },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Group applications by date
 * @param {Array} apps - Applications array
 * @returns {Object} Date groups with counts
 */
function groupByDate(apps) {
    const dateGroups = {};
    
    apps.forEach(app => {
        const date = app.applicationDate;
        dateGroups[date] = (dateGroups[date] || 0) + 1;
    });
    
    return dateGroups;
}

/**
 * Create timeline line chart
 * @param {Array} apps - Applications array
 */
function updateTimelineChart(apps) {
    const ctx = document.getElementById('timelineChart');
    const dateGroups = groupByDate(apps);
    
    // Sort dates chronologically
    const sortedDates = Object.keys(dateGroups).sort();
    const counts = sortedDates.map(date => dateGroups[date]);
    const formattedDates = sortedDates.map(formatDate);
    
    destroyChart('timelineChart');
    
    charts.timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: [{
                label: 'Applications',
                data: counts,
                borderColor: CHART_COLORS.primary,
                backgroundColor: 'rgba(13, 71, 21, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: CHART_COLORS.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1,
                        padding: 10
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

/**
 * Create application method bar chart
 * @param {Array} apps - Applications array
 */
function updateMethodChart(apps) {
    const ctx = document.getElementById('methodChart');
    
    // Count applications by method
    const methodCounts = {};
    apps.forEach(app => {
        const method = app.method || 'Not Specified';
        methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
    
    const labels = Object.keys(methodCounts);
    const data = Object.values(methodCounts);
    
    destroyChart('methodChart');
    
    charts.methodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Applications',
                data: data,
                backgroundColor: CHART_COLORS.gradient,
                borderWidth: 0,
                borderRadius: 8,
                barThickness: 40,
                maxBarThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1.8,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.x} application${context.parsed.x !== 1 ? 's' : ''}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1,
                        padding: 10
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Update top companies list
 * @param {Array} apps - Applications array
 */
function updateTopCompanies(apps) {
    const container = document.getElementById('topCompaniesList');
    
    // Count applications per company
    const companyCounts = {};
    apps.forEach(app => {
        const company = app.companyName;
        companyCounts[company] = (companyCounts[company] || 0) + 1;
    });
    
    // Sort and get top 5
    const sortedCompanies = Object.entries(companyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (sortedCompanies.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
        return;
    }
    
    const maxCount = sortedCompanies[0][1];
    
    // Render company list
    container.innerHTML = sortedCompanies.map(([company, count]) => {
        const percentage = (count / maxCount) * 100;
        return `
            <div class="company-item">
                <span class="company-name">${company}</span>
                <span class="company-count">${count}</span>
                <div class="company-bar">
                    <div class="company-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================================
// ACTIVITY & METRICS
// ============================================================================

/**
 * Render recent activity feed
 * @param {Array} apps - Applications array
 */
function updateRecentActivity(apps) {
    const container = document.getElementById('recentActivity');
    
    if (apps.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
        return;
    }
    
    // Sort by date (most recent first)
    const sortedApps = [...apps].sort((a, b) => 
        new Date(b.applicationDate) - new Date(a.applicationDate)
    );
    
    container.innerHTML = sortedApps.slice(0, 10).map(app => {
        const statusInfo = STATUS_CONFIG[app.status] || STATUS_CONFIG['Applied'];
        const date = new Date(app.applicationDate);
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="activity-item">
                <div class="activity-icon" style="background-color: ${statusInfo.bg}; color: ${statusInfo.color};">
                    <i class="fas ${statusInfo.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${app.companyName}</div>
                    <div class="activity-description">${app.jobTitle} - ${app.status}</div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Calculate and update success metrics
 * @param {Array} apps - Applications array
 */
function updateSuccessMetrics(apps) {
    const totalApps = apps.length;
    
    // Interview conversion rate
    const interviews = apps.filter(app => 
        app.status === 'Interview' || app.status === 'Offer'
    ).length;
    const interviewRate = totalApps > 0 ? Math.round((interviews / totalApps) * 100) : 0;
    
    // Offer conversion rate
    const offers = apps.filter(app => app.status === 'Offer').length;
    const offerRate = interviews > 0 ? Math.round((offers / interviews) * 100) : 0;
    
    // Most active day of week
    const dayCount = {};
    apps.forEach(app => {
        const date = new Date(app.applicationDate);
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        dayCount[day] = (dayCount[day] || 0) + 1;
    });
    
    const mostActiveDay = Object.entries(dayCount)
        .sort((a, b) => b[1] - a[1])[0];
    
    // Update DOM
    document.getElementById('avgResponseTime').textContent = '-';
    document.getElementById('interviewRate').textContent = `${interviewRate}%`;
    document.getElementById('offerRate').textContent = `${offerRate}%`;
    document.getElementById('mostActiveDay').textContent = mostActiveDay ? mostActiveDay[0] : '-';
}

// ============================================================================
// MAIN UPDATE FUNCTIONS
// ============================================================================

/**
 * Update all charts
 * @param {Array} apps - Applications array
 */
function updateCharts(apps) {
    updateStatusChart(apps);
    updateTimelineChart(apps);
    updateMethodChart(apps);
    updateTopCompanies(apps);
}

/**
 * Main analytics update function
 */
function updateAnalytics() {
    const timeRange = document.getElementById('timeRange').value;
    const filteredApps = filterByTimeRange(applications, timeRange);
    
    updateStats(filteredApps);
    updateCharts(filteredApps);
    updateRecentActivity(applications.slice(0, 10));
    updateSuccessMetrics(filteredApps);
}

/**
 * Show error state when data loading fails
 */
function showErrorState() {
    const container = document.querySelector('.analytics-container');
    const errorHTML = `
        <div class="empty-state" style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #f44336; margin-bottom: 20px;"></i>
            <p style="font-size: 1.2rem; color: #666;">Failed to load analytics data. Please try again later.</p>
        </div>
    `;
    container.innerHTML = errorHTML;
}

// ============================================================================
// EVENT LISTENERS & INITIALIZATION
// ============================================================================

/**
 * Initialize analytics page
 */
function initializeAnalytics() {
    // Time range filter
    const timeRangeSelector = document.getElementById('timeRange');
    if (timeRangeSelector) {
        timeRangeSelector.addEventListener('change', updateAnalytics);
    }
    
    // Load initial data
    loadApplications();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initializeAnalytics);