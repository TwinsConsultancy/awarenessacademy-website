

let currentSection = 'courses';

function switchSection(section) {
    currentSection = section;
    const sections = ['courses', 'materials', 'students', 'live'];
    sections.forEach(s => {
        document.getElementById(s + 'Section').style.display = s === section ? 'block' : 'none';
    });
}

async function loadSchedules() {
    const list = document.getElementById('scheduleList');
    try {
        const res = await fetch(`${Auth.apiBase}/schedules/my-timetable`, { headers: Auth.getHeaders() });
        const schedules = await res.json();

        if (schedules.length === 0) {
            list.innerHTML = '<p>No live flows scheduled.</p>';
            return;
        }

        list.innerHTML = schedules.map(s => `
            <div class="course-list-item">
                <div>
                    <strong>${s.title}</strong>
                    <p style="font-size: 0.8rem; color: var(--color-text-secondary);">
                        ${new Date(s.startTime).toLocaleString()} | Course: ${s.courseID?.title || 'Unknown'}
                    </p>
                </div>
                <div>
                    <button class="btn-primary" onclick="startLiveSession('${s.meetingLink || s._id}')" style="background: var(--color-saffron); padding: 5px 15px; font-size: 0.8rem;">Start Class</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<p>Error loading schedules.</p>';
    }
}

function startLiveSession(room) {
    const domain = 'meet.jit.si';
    const roomName = room || 'InnerSpark-General';
    const url = `https://${domain}/${roomName}`;
    window.open(url, '_blank');
}

function openUploadModal(id, title) {
    document.getElementById('uploadCourseID').value = id;
    document.getElementById('uploadCourseTitle').textContent = `Adding material to: ${title}`;
    document.getElementById('uploadModal').style.display = 'flex';
}

let qCount = 0;
function addQuestionField() {
    qCount++;
    const container = document.getElementById('questionContainer');
    const div = document.createElement('div');
    div.className = 'q-block';
    div.style.padding = '15px';
    div.style.background = '#f9f9f9';
    div.style.borderRadius = '8px';
    div.style.marginBottom = '15px';

    div.innerHTML = `
        <label>Question ${qCount}</label>
        <input type="text" class="form-control q-text" placeholder="The question..." required style="margin-bottom:10px;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
            <input type="text" class="opt-text form-control" placeholder="Option 1" required>
            <input type="text" class="opt-text form-control" placeholder="Option 2" required>
            <input type="text" class="opt-text form-control" placeholder="Option 3" required>
            <input type="text" class="opt-text form-control" placeholder="Option 4" required>
        </div>
        <label>Correct Option Index (0-3)</label>
        <input type="number" class="correct-idx form-control" min="0" max="3" value="0" required>
    `;
    container.appendChild(div);
}

async function loadCourses() {
    try {
        const res = await fetch(`${Auth.apiBase}/staff/courses`, {
            headers: Auth.getHeaders()
        });
        const courses = await res.json();
        localStorage.setItem('staffCourses', JSON.stringify(courses));
        const list = document.getElementById('courseList');

        if (courses.length === 0) {
            list.innerHTML = '<p>You haven\'t started any sanctuary projects yet.</p>';
            return;
        }

        list.innerHTML = courses.map(c => `
            <div class="course-list-item">
                <div>
                    <strong>${c.title}</strong>
                    <p style="font-size: 0.8rem; color: var(--color-text-secondary);">${c.category} | status: <span style="color: var(--color-saffron)">${c.status}</span></p>
                </div>
                <div>
                    <button class="btn-primary" onclick="openUploadModal('${c._id}', '${c.title}')" style="background: var(--color-golden); padding: 5px 15px; font-size: 0.8rem;">+ Add Content</button>
                    <button class="btn-primary" style="padding: 5px 15px; font-size: 0.8rem;">Edit</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

document.getElementById('newExamBtn').addEventListener('click', () => {
    const select = document.getElementById('examCourseSelect');
    const courses = JSON.parse(localStorage.getItem('staffCourses') || '[]');
    select.innerHTML = courses.map(c => `<option value="${c._id}">${c.title}</option>`).join('');
    document.getElementById('examModal').style.display = 'flex';
});

document.getElementById('closeExamModal').addEventListener('click', () => {
    document.getElementById('examModal').style.display = 'none';
});

function openScheduleModal() {
    const select = document.getElementById('scheduleCourseSelect');
    const courses = JSON.parse(localStorage.getItem('staffCourses') || '[]');
    select.innerHTML = courses.map(c => `<option value="${c._id}">${c.title}</option>`).join('');
    document.getElementById('scheduleModal').style.display = 'flex';
}
// My Materials Management
async function loadMyMaterials() {
    try {
        UI.showLoader();
        const res = await fetch(`${Auth.apiBase}/courses/materials/my`, {
            headers: Auth.getHeaders()
        });
        
        if (!res.ok) throw new Error('Failed to load materials');
        
        const materials = await res.json();
        const list = document.getElementById('myMaterialsList');
        
        if (materials.length === 0) {
            list.innerHTML = '<p style="color: var(--color-text-secondary);">No materials uploaded yet.</p>';
            return;
        }
        
        // Group by approval status
        const pending = materials.filter(m => m.approvalStatus === 'Pending');
        const approved = materials.filter(m => m.approvalStatus === 'Approved');
        const rejected = materials.filter(m => m.approvalStatus === 'Rejected');
        
        let html = '';
        
        // Pending Materials
        if (pending.length > 0) {
            html += `
                <h4 style="color: var(--color-saffron); margin-bottom: 15px;">
                    <i class="fas fa-clock"></i> Pending Approval (${pending.length})
                </h4>
                <div style="margin-bottom: 30px;">
                    ${pending.map(m => renderMaterialCard(m, true)).join('')}
                </div>
            `;
        }
        
        // Rejected Materials
        if (rejected.length > 0) {
            html += `
                <h4 style="color: var(--color-error); margin-bottom: 15px;">
                    <i class="fas fa-times-circle"></i> Needs Corrections (${rejected.length})
                </h4>
                <div style="margin-bottom: 30px;">
                    ${rejected.map(m => renderMaterialCard(m, true)).join('')}
                </div>
            `;
        }
        
        // Approved Materials
        if (approved.length > 0) {
            html += `
                <h4 style="color: var(--color-success); margin-bottom: 15px;">
                    <i class="fas fa-check-circle"></i> Approved Materials (${approved.length})
                </h4>
                <div>
                    ${approved.map(m => renderMaterialCard(m, false)).join('')}
                </div>
            `;
        }
        
        list.innerHTML = html;
    } catch (err) {
        console.error(err);
        UI.error('Failed to load materials');
    } finally {
        UI.hideLoader();
    }
}

function renderMaterialCard(material, canEdit) {
    const statusColors = {
        'Pending': 'var(--color-saffron)',
        'Approved': 'var(--color-success)',
        'Rejected': 'var(--color-error)'
    };
    
    const icons = {
        'video': 'fa-video',
        'pdf': 'fa-file-pdf',
        'audio': 'fa-music'
    };
    
    return `
        <div class="course-list-item" style="margin-bottom: 15px;">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${icons[material.category] || 'fa-file'}" 
                       style="font-size: 1.5rem; color: ${statusColors[material.approvalStatus]};"></i>
                    <div>
                        <strong>${material.title}</strong>
                        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 5px;">
                            ${material.type} | 
                            <span style="color: ${statusColors[material.approvalStatus]}; font-weight: 600;">
                                ${material.approvalStatus}
                            </span>
                        </p>
                        ${material.rejectionReason ? `
                            <div style="background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 8px; margin-top: 10px;">
                                <strong style="color: var(--color-error); font-size: 0.85rem;">
                                    <i class="fas fa-exclamation-circle"></i> Corrections Needed:
                                </strong>
                                <p style="color: var(--color-error); font-size: 0.85rem; margin-top: 5px;">
                                    ${material.rejectionReason}
                                </p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                ${canEdit ? `
                    <button class="btn-primary" onclick="openEditMaterial('${material._id}')" 
                            style="padding: 8px 16px; font-size: 0.85rem; background: var(--color-golden);">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                ` : `
                    <button class="btn-primary" onclick="viewMaterial('${material._id}')" 
                            style="padding: 8px 16px; font-size: 0.85rem;">
                        <i class="fas fa-eye"></i> View
                    </button>
                `}
            </div>
        </div>
    `;
}

async function openEditMaterial(materialId) {
    try {
        UI.showLoader();
        const res = await fetch(`${Auth.apiBase}/courses/materials/${materialId}`, {
            headers: Auth.getHeaders()
        });
        
        if (!res.ok) throw new Error('Failed to load material');
        
        const material = await res.json();
        
        // Populate edit form
        document.getElementById('editMaterialId').value = material._id;
        document.getElementById('editMaterialTitle').value = material.title;
        document.getElementById('editMaterialType').value = material.type;
        document.getElementById('editPreviewDuration').value = material.previewDuration || 30;
        
        // Show modal
        document.getElementById('editMaterialModal').style.display = 'flex';
    } catch (err) {
        console.error(err);
        UI.error('Failed to load material for editing');
    } finally {
        UI.hideLoader();
    }
}

document.getElementById('closeEditMaterialModal').addEventListener('click', () => {
    document.getElementById('editMaterialModal').style.display = 'none';
    document.getElementById('editMaterialForm').reset();
});

document.getElementById('editMaterialForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const materialId = document.getElementById('editMaterialId').value;
    const formData = new FormData();
    
    formData.append('title', document.getElementById('editMaterialTitle').value);
    formData.append('previewDuration', document.getElementById('editPreviewDuration').value);
    
    const fileInput = document.getElementById('editMaterialFile');
    if (fileInput.files[0]) {
        formData.append('file', fileInput.files[0]);
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Updating...';
    btn.disabled = true;
    
    try {
        UI.showLoader();
        const res = await fetch(`${Auth.apiBase}/courses/materials/${materialId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        if (res.ok) {
            UI.success('Material updated successfully!');
            document.getElementById('editMaterialModal').style.display = 'none';
            loadMyMaterials(); // Reload the list
        } else {
            const err = await res.json();
            UI.error('Update failed: ' + err.message);
        }
    } catch (err) {
        console.error(err);
        UI.error('Update failed. Please try again.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
        UI.hideLoader();
    }
});

function viewMaterial(materialId) {
    // For approved materials, just show a success message
    // In a full implementation, this would open the material in a viewer
    UI.success('Material viewer coming soon! Material ID: ' + materialId);
}