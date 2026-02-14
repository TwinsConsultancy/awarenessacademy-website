// Student Dashboard Analytics - Real Data from API
let analyticsData = null;
let weeklyProgressChart = null;
let courseDistributionChart = null;

// Fetch and display analytics
async function loadAnalytics() {
    try {
        const response = await fetch(`${Auth.apiBase}/students/analytics`, {
            headers: Auth.getHeaders()
        });

        if (!response.ok) {
            console.error('Failed to fetch analytics');
            return;
        }

        analyticsData = await response.json();

        // Update stats cards
        updateStatsCards();

        // Load Chart.js and create charts
        await window.loadChartJS();
        createCharts();

        // Update activity feed with real data
        updateActivityFeed();

        // Show upcoming exams
        updateUpcomingExams();

        // Show achievements
        updateAchievements();

    } catch (err) {
        console.error('Analytics error:', err);
    }
}

// Update stats cards with real data
function updateStatsCards() {
    if (!analyticsData) return;

    const { stats } = analyticsData;

    // Update analytics section stats
    document.getElementById('analyticsEnrolled').textContent = stats.enrolledCourses;
    document.getElementById('analyticsProgress').textContent = `${stats.overallProgress}%`;
    document.getElementById('analyticsCertificates').textContent = stats.certificatesEarned;
    document.getElementById('analyticsStreak').textContent = stats.studyStreak;

    // Also update main dashboard stats
    document.getElementById('enrolledCount').textContent = stats.enrolledCourses;
    document.getElementById('avgProgress').textContent = `${stats.overallProgress}%`;

    // Update hero banner stats with animation
    animateValue('heroEnrolled', 0, stats.enrolledCourses, 1000);
    animateValue('heroProgress', 0, stats.overallProgress, 1000, '%');
    animateValue('heroCertificates', 0, stats.certificatesEarned, 1000);
}

// Count-up animation for numbers
function animateValue(id, start, end, duration, suffix = '') {
    const element = document.getElementById(id);
    if (!element) return;

    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current) + suffix;
    }, 16);
}

// Create Chart.js visualizations
function createCharts() {
    if (!analyticsData || !window.Chart) return;

    const { progressData, courseDistribution } = analyticsData;

    // Destroy existing charts if any
    if (weeklyProgressChart) weeklyProgressChart.destroy();
    if (courseDistributionChart) courseDistributionChart.destroy();

    // Weekly Progress Chart (Line)
    const progressCtx = document.getElementById('weeklyProgressChart');
    if (progressCtx) {
        weeklyProgressChart = new Chart(progressCtx, {
            type: 'line',
            data: {
                labels: progressData.labels,
                datasets: [{
                    label: 'Course Progress',
                    data: progressData.values,
                    borderColor: 'rgb(255, 153, 51)',
                    backgroundColor: 'rgba(255, 153, 51, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Progress: ${context.parsed.y}%`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    }
                }
            }
        });
    }

    // Course Distribution Chart (Doughnut)
    const distCtx = document.getElementById('courseDistributionChart');
    if (distCtx && courseDistribution.length > 0) {
        const colors = [
            'rgb(255, 153, 51)',  // Saffron
            'rgb(255, 195, 0)',    // Golden
            'rgb(16, 185, 129)',   // Green
            'rgb(245, 158, 11)',   // Orange
            'rgb(139, 92, 246)'    // Purple
        ];

        courseDistributionChart = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: courseDistribution.map(c => c.category),
                datasets: [{
                    data: courseDistribution.map(c => c.count),
                    backgroundColor: colors.slice(0, courseDistribution.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    } else if (distCtx) {
        // No courses - show message
        distCtx.parentElement.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <i class="fas fa-chart-pie" style="font-size: 3rem; opacity: 0.3;"></i>
                <p style="margin-top: 15px;">No courses enrolled yet</p>
            </div>
        `;
    }
}

// Update activity feed with real data
function updateActivityFeed() {
    if (!analyticsData) return;

    const { recentActivity } = analyticsData;
    const activityList = document.getElementById('activityList');

    if (recentActivity.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon" style="background: #f0f0f0; color: #999;">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                    <p>No recent activity</p>
                    <span class="activity-time">Start learning to see your activity</span>
                </div>
            </div>
        `;
        return;
    }

    activityList.innerHTML = recentActivity.map(item => `
        <div class="activity-item">
            <div class="activity-icon" style="background: ${item.color}15; color: ${item.color};">
                <i class="fas fa-${item.icon}"></i>
            </div>
            <div class="activity-content">
                <p>${item.title}</p>
                <span class="activity-time">${formatTimeAgo(item.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

// Update upcoming exams widget
function updateUpcomingExams() {
    if (!analyticsData) return;

    const { upcomingExams } = analyticsData;
    const widget = document.getElementById('upcomingExamsWidget');
    const list = document.getElementById('upcomingExamsList');

    if (upcomingExams.length > 0) {
        widget.style.display = 'block';
        list.innerHTML = upcomingExams.map(exam => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f9f9f9; border-radius: 10px;">
                <div>
                    <h5 style="margin: 0 0 5px 0; color: var(--color-primary);">${exam.title}</h5>
                    <p style="margin: 0; font-size: 0.85rem; color: #666;">${exam.courseTitle}</p>
                    <div style="margin-top: 8px; display: flex; gap: 15px; font-size: 0.8rem; color: #999;">
                        <span><i class="fas fa-clock"></i> ${exam.duration} mins</span>
                        <span><i class="fas fa-check-circle"></i> Pass: ${exam.passingScore}%</span>
                        <span><i class="fas fa-list-ol"></i> ${exam.questionCount} questions</span>
                    </div>
                </div>
                <button onclick="window.location.href='exam.html?id=${exam.examID}'" class="btn-primary" style="padding: 10px 20px; white-space: nowrap;">
                    <i class="fas fa-play"></i> Start
                </button>
            </div>
        `).join('');
    } else {
        widget.style.display = 'none';
    }
}

// Update achievements section
function updateAchievements() {
    if (!analyticsData) return;

    const { achievements } = analyticsData;
    const section = document.getElementById('achievementsSection');
    const badges = document.getElementById('achievementsBadges');

    if (achievements.length > 0) {
        section.style.display = 'block';
        badges.innerHTML = achievements.map(achievement => `
            <div style="text-align: center; padding: 15px; background: linear-gradient(135deg, #FFF9E6, #FFE4B5); border-radius: 12px; border: 2px solid var(--color-golden);">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--color-golden); color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 1.5rem;">
                    <i class="fas fa-${achievement.icon}"></i>
                </div>
                <h6 style="margin: 0 0 5px 0; font-size: 0.9rem; color: var(--color-primary);">${achievement.title}</h6>
                <p style="margin: 0; font-size: 0.75rem; color: #666;">${achievement.description}</p>
            </div>
        `).join('');
    } else {
        section.style.display = 'none';
    }
}

// Format timestamp to relative time
function formatTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return past.toLocaleDateString();
}

// Hook into existing navigation
const originalSwitchSection = window.switchSection;
window.switchSection = function (section) {
    if (typeof originalSwitchSection === 'function') {
        originalSwitchSection(section);
    }

    // Load analytics when switching to analytics section
    if (section === 'analytics' && !analyticsData) {
        loadAnalytics();
    }
};

// Load analytics on page load if on courses section (for dashboard stats)
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for auth to initialize
    setTimeout(() => {
        const token = localStorage.getItem('token');
        if (token) {
            loadAnalytics();
        }
    }, 500);
});
