/**
 * InnerSpark - Course Player & Tracking Logic (Refactored for Modules)
 */

let currentCourseID = null;
let currentModuleID = null;
let hasFullAccess = false;

document.addEventListener('DOMContentLoaded', async () => {
    // SECURITY: Prevent caching of this page
    if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
    }

    // SECURITY: Strict authentication check - must be logged in with valid token
    const auth = Auth.checkAuth();
    if (!auth) {
        // checkAuth redirects to login.html if no token
        return;
    }

    // SECURITY: Validate token with backend before proceeding
    try {
        const validateRes = await fetch(`${Auth.apiBase}/auth/validate`, {
            method: 'GET',
            headers: Auth.getHeaders()
        });

        if (!validateRes.ok) {
            console.error('Token validation failed');
            Auth.logout();
            return;
        }
    } catch (err) {
        console.error('Auth validation error:', err);
        Auth.logout();
        return;
    }

    const params = new URLSearchParams(window.location.search);
    currentCourseID = params.get('course');
    currentModuleID = params.get('content'); // URL param 'content' maps to module ID

    if (!currentCourseID) {
        window.location.href = 'courses.html';
        return;
    }

    await loadPlayer();
    loadForum();

    // Forum Submission
    const forumForm = document.getElementById('forumForm');
    if (forumForm) {
        forumForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const comment = forumForm.comment.value;
            try {
                const res = await fetch(`${Auth.apiBase}/forum/add`, {
                    method: 'POST',
                    headers: Auth.getHeaders(),
                    body: JSON.stringify({ courseID: currentCourseID, comment })
                });
                await res.json();
                forumForm.reset();
                loadForum();
            } catch (err) {
                alert('Connection error.');
            }
        });
    }
});

async function loadPlayer() {
    try {
        UI.showLoader();
        const res = await fetch(`${Auth.apiBase}/courses/${currentCourseID}`, {
            headers: Auth.getHeaders()
        });
        const data = await res.json();

        hasFullAccess = data.hasFullAccess; // Access based on enrollment
        document.getElementById('courseTitle').textContent = data.course.title;
        const mentorName = data.course.mentors && data.course.mentors.length > 0 ? data.course.mentors[0].name : 'InnerSpark Guides';
        document.getElementById('mentorName').textContent = `By ${mentorName}`;

        // Render Curriculum (Modules)
        if (data.modules && data.modules.length > 0) {

            // If no specific module selected, default to first module
            if (!currentModuleID) {
                currentModuleID = data.modules[0]._id;
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('content', currentModuleID);
                window.history.pushState({}, '', newUrl);
            }

            // Get user progress to determine locks
            let completedModuleIds = [];
            try {
                const progRes = await fetch(`${Auth.apiBase}/progress/${currentCourseID}`, { headers: Auth.getHeaders() });
                const progData = await progRes.json();
                completedModuleIds = progData.completedModules || [];
            } catch (e) { console.error('Error fetching progress for locks', e); }

            renderCurriculum(data.modules, completedModuleIds);

            if (currentModuleID === 'intro') {
                loadIntroIframe();
            } else {
                // Check if requested module is locked
                // It's locked if it's NOT the first module AND the previous module is NOT completed
                const modIndex = data.modules.findIndex(m => m._id === currentModuleID);
                const prevModule = modIndex > 0 ? data.modules[modIndex - 1] : null;
                const isLocked = !hasFullAccess || (prevModule && !completedModuleIds.includes(prevModule._id));

                if (isLocked && modIndex > 0) {
                    UI.info('This module is locked. Complete previous modules first.');
                    // Redirect to first unlocked/incomplete module or just the first one
                    currentModuleID = data.modules[0]._id;
                    loadModuleContent(data.modules[0]);
                } else {
                    const activeModule = data.modules.find(m => m._id === currentModuleID);
                    if (activeModule) {
                        loadModuleContent(activeModule);
                    } else {
                        currentModuleID = data.modules[0]._id;
                        loadModuleContent(data.modules[0]);
                    }
                }
            }
        } else {
            document.getElementById('curriculumList').innerHTML = '<p style="padding:20px; color:#ccc;">No modules available yet.</p>';
        }

        // Mock viewer count
        document.getElementById('viewCount').textContent = Math.floor(Math.random() * 50) + 5;

    } catch (err) {
        console.error(err);
        UI.error('The stream of wisdom is interrupted.');
    } finally {
        UI.hideLoader();
    }
}

function renderCurriculum(modules, completedModuleIds = []) {
    const list = document.getElementById('curriculumList');

    // Create Course Intro Item
    const introItem = `
        <li class="content-item ${currentModuleID === 'intro' ? 'active' : ''}" 
             onclick="switchModule('intro')">
            <div class="module-number" style="background: var(--color-golden); color: white;">
                <i class="fas fa-info"></i>
            </div>
            <div class="module-info">
                <p style="font-size: 0.95rem; font-weight:500; margin-bottom:2px;">Course Intro</p>
                <small style="color: #888;">Overview & Details</small>
            </div>
        </li>
    `;

    const modulesHtml = modules.map((item, index) => {
        // Locking Logic:
        // 1. If no full access (not enrolled), everything locked (except potentially preview, but we handle that with hasFullAccess)
        // 2. If enrolled:
        //    - First module (index 0) is ALWAYS unlocked.
        //    - Subsequent modules are unlocked ONLY IF the previous module is in completedModuleIds.

        let isLocked = !hasFullAccess;
        if (hasFullAccess) {
            if (index === 0) {
                isLocked = false;
            } else {
                const prevModuleId = modules[index - 1]._id;
                const isPrevCompleted = completedModuleIds.includes(prevModuleId);
                isLocked = !isPrevCompleted;

                // Debug logging for locking logic
                console.log(`Module ${index} (${item.title}): Prev (${prevModuleId}) completed? ${isPrevCompleted} -> Locked? ${isLocked}`);
            }
        }

        const isCompleted = completedModuleIds.includes(item._id);

        // Determine icon based on content type
        let icon = '<i class="fas fa-book-open"></i> Read';
        if (item.contentType === 'video') {
            icon = '<i class="fas fa-play-circle"></i> Video';
        } else if (item.contentType === 'pdf') {
            icon = '<i class="fas fa-file-pdf"></i> PDF';
        }

        // Status Text
        let statusHtml = '';
        if (isLocked) {
            statusHtml = '<i class="fas fa-lock"></i> Locked';
        } else if (isCompleted) {
            statusHtml = '<i class="fas fa-check-circle" style="color:var(--color-success)"></i> Completed';
        } else {
            statusHtml = icon;
        }

        return `
            <li class="content-item ${item._id === currentModuleID ? 'active' : ''} ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}" 
                 onclick="${isLocked ? `UI.info('Complete previous module to unlock.')` : `switchModule('${item._id}')`}"
                 style="${isLocked ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
                <div class="module-number" style="${isCompleted ? 'background:var(--color-success); border-color:var(--color-success); color:white;' : ''}">
                    ${isCompleted ? '<i class="fas fa-check"></i>' : index + 1}
                </div>
                <div class="module-info">
                    <p style="font-size: 0.95rem; font-weight:500; margin-bottom:2px;">${item.title}</p>
                    <small style="color: ${isLocked ? '#666' : '#888'};">
                        ${statusHtml}
                    </small>
                </div>
            </li>
        `;
    }).join('');

    list.innerHTML = introItem + modulesHtml;
}

// Global state for progress
let progressInterval = null;
let timeSpentInModule = 0; // Total time spent (loaded + current session)
let unsavedTime = 0; // Time spent since last sync
let moduleTotalDuration = 600;
let userHasControl = true;
let heartbeatInterval = null;

// ... existing loadPlayer function ...

async function loadModuleContent(module) {
    console.log('Loading module:', module);

    // Clear previous intervals
    if (progressInterval) clearInterval(progressInterval);
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    // Remove old listeners to prevent duplicates (though loadModuleContent usually runs on fresh page load or swap)
    window.removeEventListener('beforeunload', handleUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);

    // Initialize timer state
    timeSpentInModule = 0;
    unsavedTime = 0;
    moduleTotalDuration = (module.duration || 10) * 60; // Duration in seconds

    // Fetch existing progress for this module to resume timer
    try {
        const progRes = await fetch(`${Auth.apiBase}/progress/${currentCourseID}`, { headers: Auth.getHeaders() });
        const progData = await progRes.json();
        // Ensure accurate comparison of IDs
        const modProgress = progData.moduleProgress?.find(m => m.moduleID.toString() === module._id.toString());
        if (modProgress) {
            timeSpentInModule = modProgress.timeSpent || 0;
            console.log('Resuming progress from:', timeSpentInModule);
        }
    } catch (e) { console.error('Error fetching module progress', e); }

    const video = document.getElementById('mainVideo');
    const overlay = document.getElementById('previewOverlay');
    const title = document.getElementById('contentTitle');
    const downloadBtn = document.getElementById('downloadNotesBtn');
    const markBtn = document.getElementById('markCompleteBtn');

    // Timer Display
    let timerDisplay = document.getElementById('moduleTimer');
    if (!timerDisplay) {
        timerDisplay = document.createElement('div');
        timerDisplay.id = 'moduleTimer';
        timerDisplay.style.cssText = 'position:fixed; bottom:20px; right:20px; background:rgba(0,0,0,0.8); color:white; padding:10px 15px; border-radius:30px; font-weight:bold; font-size:14px; z-index:1000; box-shadow:0 4px 15px rgba(0,0,0,0.2); backdrop-filter:blur(5px); display:flex; align-items:center; gap:10px; border:1px solid var(--color-saffron);';
        document.body.appendChild(timerDisplay);
    }
    timerDisplay.style.display = 'flex';
    updateTimerDisplay();

    // Start Timer
    progressInterval = setInterval(() => {
        if (document.visibilityState === 'visible') { // Only count when tab is active
            timeSpentInModule++;
            unsavedTime++;
            updateTimerDisplay();
        }
    }, 1000);

    // Start Heartbeat (Sync every 5s for better granularity)
    heartbeatInterval = setInterval(() => syncProgress(false), 5000);

    // Add listeners for robust saving
    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Content Display Area
    let contentDisplay = document.getElementById('htmlContentDisplay');
    if (!contentDisplay) {
        contentDisplay = document.createElement('div');
        contentDisplay.id = 'htmlContentDisplay';
        contentDisplay.className = 'content-body';
        contentDisplay.style.padding = '20px';
        contentDisplay.style.lineHeight = '1.8';
        contentDisplay.style.color = '#333';
        contentDisplay.style.background = '#fff';
        contentDisplay.style.borderRadius = '8px';
        contentDisplay.style.marginTop = '20px';
        video.parentNode.insertBefore(contentDisplay, video.nextSibling);
    }

    // Reset all displays
    video.style.display = 'none';
    video.pause();
    video.removeAttribute('src');
    overlay.style.display = 'none';
    contentDisplay.style.display = 'none';
    contentDisplay.innerHTML = '';
    downloadBtn.style.display = 'none';

    title.textContent = module.title;

    // Handle different content types
    const contentType = module.contentType || 'rich-content';
    let fileUrl = module.fileUrl;

    console.log('Content type:', contentType, 'File URL:', fileUrl);

    if (contentType === 'video' && fileUrl) {
        // VIDEO MODULE - Direct Static URL
        video.src = fileUrl;
        video.style.display = 'block';
        video.load();

        // Disable right-click on video to prevent easy download
        video.addEventListener('contextmenu', e => e.preventDefault());

        // Show description if available
        if (module.content) {
            contentDisplay.innerHTML = UI.fixContentUrls(module.content);
            contentDisplay.style.display = 'block';
        }
    } else if (contentType === 'pdf' && fileUrl) {
        // PDF MODULE - Direct Static URL
        contentDisplay.innerHTML = `
            <div style="width: 100%; height: 700px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <iframe src="${fileUrl}" width="100%" height="100%" style="border: none;">
                    <p>Your browser does not support PDFs. 
                       <a href="${fileUrl}" target="_blank" style="color: var(--color-saffron);">Download the PDF</a>
                    </p>
                </iframe>
            </div>
            ${module.content ? `<div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">${module.content}</div>` : ''}
        `;
        contentDisplay.style.display = 'block';

        // Show download button for PDFs
        downloadBtn.href = fileUrl;
        downloadBtn.download = module.title + '.pdf';
        downloadBtn.style.display = 'inline-block';
    } else {
        // RICH CONTENT (default)
        contentDisplay.innerHTML = UI.fixContentUrls(module.content) || '<p style="color:#666; font-style:italic;">No content available for this module.</p>';
        contentDisplay.style.display = 'block';
    }

    // Mark Complete Button
    markBtn.style.display = 'block';
    markBtn.innerHTML = 'Mark as Complete';
    markBtn.style.background = '#ccc'; // initially disabled
    markBtn.disabled = true;

    // Check existing progress
    checkCompletionStatus(module._id);
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('moduleTimer');
    if (!timerDisplay) return;

    const percent = Math.min((timeSpentInModule / moduleTotalDuration) * 100, 100);
    const mins = Math.floor(timeSpentInModule / 60);
    const secs = timeSpentInModule % 60;

    // Check if 50% threshold reached for unlocking button
    const requiredSeconds = moduleTotalDuration * 0.5;
    const isReady = timeSpentInModule >= requiredSeconds;

    let icon = '<i class="fas fa-hourglass-half fa-spin"></i>';
    if (isReady) icon = '<i class="fas fa-check-circle" style="color: var(--color-golden);"></i>';

    timerDisplay.innerHTML = `${icon} <span>${mins}:${secs.toString().padStart(2, '0')}</span> <small style="opacity:0.7">/ ${(moduleTotalDuration / 60).toFixed(0)}m</small>`;

    // Enable button if threshold reached and not already completed
    const markBtn = document.getElementById('markCompleteBtn');
    if (markBtn && isReady && !markBtn.innerHTML.includes('Completed')) {
        markBtn.disabled = false;
        markBtn.style.background = 'var(--color-saffron)';
    }
}

const handleUnload = () => syncProgress(true);
const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
        syncProgress(false);
    }
};

async function syncProgress(isUnload = false) {
    if (unsavedTime > 0) {
        const timeToSend = unsavedTime;
        // Reset immediately to prevent double sending if multiple events trigger rapidly
        unsavedTime = 0;

        try {
            const payload = JSON.stringify({
                courseID: currentCourseID,
                moduleID: currentModuleID,
                timeSpent: timeToSend
            });

            if (isUnload) {
                // Use fetch with keepalive for unload events
                // Note: Auth headers might be tricky with keepalive if they depend on localStorage, 
                // but usually fine as long as token is in header.
                // However, fetch keepalive has size limits.
                fetch(`${Auth.apiBase}/progress/update-progress`, {
                    method: 'POST',
                    headers: Auth.getHeaders(),
                    body: payload,
                    keepalive: true
                });
            } else {
                const res = await fetch(`${Auth.apiBase}/progress/update-progress`, {
                    method: 'POST',
                    headers: Auth.getHeaders(),
                    body: payload
                });
                const data = await res.json();

                if (data.moduleCompleted) {
                    const markBtn = document.getElementById('markCompleteBtn');
                    if (markBtn) {
                        markBtn.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
                        markBtn.style.background = 'var(--color-success)';
                        markBtn.disabled = true;
                    }

                    // Unlock next module in UI without full reload if possible
                    updateCurriculumWithCompletion(data.nextModuleID);
                    UI.success('Module successfully completed!');
                }
            }
            console.log(`Synced ${timeToSend}s`);
        } catch (err) {
            console.error('Sync failed', err);
            // Put time back if failed? Tricky because of async. 
            // For now, assume best effort.
        }
    }
}

function updateCurriculumWithCompletion(nextModuleId) {
    // Helper to refresh locks without full reload
    // For now, easiest to just re-fetch progress or reload player data
    loadPlayer();
}

async function checkCompletionStatus(moduleId) {
    const markBtn = document.getElementById('markCompleteBtn');
    try {
        const res = await fetch(`${Auth.apiBase}/progress/${currentCourseID}`, {
            headers: Auth.getHeaders()
        });
        const progress = await res.json();

        // Check if completed in backend
        const isCompleted = progress.completedModules && progress.completedModules.includes(moduleId);

        if (isCompleted) {
            markBtn.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
            markBtn.style.background = 'var(--color-success)';
            markBtn.disabled = true;

            // If already completed, user can move freely
            userHasControl = true;
        } else {
            // Not completed
            userHasControl = false;
        }

        // Render locking state in list
        updateCurriculumWithLocks(progress.completedModules || []);

    } catch (err) { }
}

function updateCurriculumWithLocks(completedModules) {
    const items = document.querySelectorAll('.content-item');
    let locked = false; // Start unlocked (first item always unlocked)

    // Logic: Item is locked if previous item is NOT in completedModules
    // Exception: First item is always unlocked
    // Exception: hasFullAccess=false (handled in renderCurriculum)

    // We need to re-render to apply locks properly based on data
    // Or we can iterate DOM (easier if we have IDs)

    // ... Actually, easier to let renderCurriculum handle it by passing progress
    // But renderCurriculum is called once. We should reload it.
}

// ... existing switchModule ...

async function loadForum() {
    // ... existing loadForum ...
}

async function markAsComplete() {
    // Legacy function, kept for compatibility but main logic moved to syncProgress
    // We can use this for manual trigger if time threshold met
    const btn = document.getElementById('markCompleteBtn');
    if (btn.disabled) return UI.info('You must spend more time on this module.');

    try {
        await syncProgress(); // Force sync
        // Logic handled in syncProgress response
    } catch (err) {
        UI.error('Could not update progress.');
    }
}

function loadIntroIframe() {
    console.log('Loading Course Intro Iframe');
    if (progressInterval) clearInterval(progressInterval);
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    const timer = document.getElementById('moduleTimer');
    if (timer) timer.style.display = 'none';

    // ... existing loadIntroIframe content ...
}

// Ensure functions are global
window.switchModule = switchModule;
window.loadIntroIframe = loadIntroIframe;
window.markAsComplete = markAsComplete;
