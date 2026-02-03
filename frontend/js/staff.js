/**
 * InnerSpark - Staff Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify Auth
    const authData = Auth.checkAuth(['Staff']);
    if (!authData) return;

    const { user } = authData;
    document.getElementById('mentorName').textContent = user.name;
    
    // Set staff name and avatar in top header
    if (user) {
        document.getElementById('staffName').textContent = user.name || 'Mentor';
        const avatar = document.getElementById('staffAvatar');
        avatar.textContent = (user.name || 'M').charAt(0).toUpperCase();
    }

    // 2. Modals Logic
    const courseModal = document.getElementById('courseModal');
    const uploadModal = document.getElementById('uploadModal');

    document.getElementById('newCourseBtn').addEventListener('click', () => courseModal.style.display = 'flex');
    document.getElementById('closeModal').addEventListener('click', () => courseModal.style.display = 'none');
    document.getElementById('closeUploadModal').addEventListener('click', () => uploadModal.style.display = 'none');

    // 3. Load Courses
    loadCourses();

    // 4. Create Course
    document.getElementById('courseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());

        try {
            UI.showLoader();
            const res = await fetch(`${Auth.apiBase}/staff/courses`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                UI.success('Course draft created!');
                courseModal.style.display = 'none';
                loadCourses();
            }
        } catch (err) {
            UI.error('Could not initiate the course draft.');
        } finally {
            UI.hideLoader();
        }
    });

    // 5. Upload Content
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Add title field if not present (use filename as title)
        if (!formData.get('title')) {
            const fileInput = e.target.querySelector('input[type="file"]');
            const fileName = fileInput.files[0]?.name || 'Untitled Material';
            formData.append('title', fileName.split('.')[0]);
        }
        
        // Add category based on type
        const type = formData.get('type');
        const categoryMap = {
            'Video': 'video',
            'PDF': 'pdf',
            'Audio': 'audio',
            'Note': 'pdf'
        };
        formData.append('category', categoryMap[type] || 'pdf');
        
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Uploading...';
        btn.disabled = true;

        try {
            UI.showLoader();
            const res = await fetch(`${Auth.apiBase}/courses/materials/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            if (res.ok) {
                UI.success("Material uploaded successfully! Awaiting admin approval.");
                uploadModal.style.display = 'none';
                e.target.reset();
                // Reload materials if on materials section
                if (currentSection === 'materials') {
                    loadMyMaterials();
                }
            } else {
                const err = await res.json();
                UI.error('Upload failed: ' + err.message);
            }
        } catch (err) {
            console.error(err);
            UI.error('Upload failed. Please try again.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
            UI.hideLoader();
        }
    });

    // Material Type Toggle
    document.getElementById('materialType').addEventListener('change', (e) => {
        const group = document.getElementById('previewDurationGroup');
        group.style.display = e.target.value === 'Video' ? 'block' : 'none';
    });

    // 6. Create Exam
    document.getElementById('examForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            courseID: formData.get('courseID'),
            title: formData.get('title'),
            duration: formData.get('duration'),
            passingScore: formData.get('passingScore'),
            questions: []
        };

        const qBlocks = document.querySelectorAll('.q-block');
        qBlocks.forEach(block => {
            const q = block.querySelector('.q-text').value;
            const opts = Array.from(block.querySelectorAll('.opt-text')).map(input => input.value);
            const correct = block.querySelector('.correct-idx').value;
            data.questions.push({ question: q, options: opts, correctAnswerIndex: correct });
        });

        try {
            UI.showLoader();
            const res = await fetch(`${Auth.apiBase}/exams/create`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                UI.success('Assessment established successfully!');
                examModal.style.display = 'none';
            }
        } catch (err) { UI.error('Assessment creation failed.'); }
        finally { UI.hideLoader(); }
    });

    // 7. Schedule Flow
    document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());

        try {
            UI.showLoader();
            const res = await fetch(`${Auth.apiBase}/schedules`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                UI.success('Live flow scheduled!');
                document.getElementById('scheduleModal').style.display = 'none';
                if (currentSection === 'live') loadSchedules();
            }
        } catch (err) { UI.error('Scheduling failed.'); }
        finally { UI.hideLoader(); }
    });

    document.getElementById('closeScheduleModal').addEventListener('click', () => {
        document.getElementById('scheduleModal').style.display = 'none';
    });
});

let currentSection = 'courses';

function switchSection(section) {
    currentSection = section;
    const sections = ['courses', 'materials', 'students', 'live'];
    sections.forEach(s => {
        document.getElementById(s + 'Section').style.display = s === section ? 'block' : 'none';
    });

    // Update Nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(section)) link.classList.add('active');
    });

    if (section === 'students') loadStudentInsights();
    if (section === 'live') loadSchedules();
    if (section === 'courses') loadCourses();
    if (section === 'materials') loadMyMaterials();
}

async function loadStudentInsights() {
    const list = document.getElementById('studentInsightList');
    try {
        const res = await fetch(`${Auth.apiBase}/staff/students`, { headers: Auth.getHeaders() });
        const enrollments = await res.json();

        if (enrollments.length === 0) {
            list.innerHTML = '<tr><td colspan="4" style="padding:20px; text-align:center;">No seekers have joined your paths yet.</td></tr>';
            return;
        }

        list.innerHTML = enrollments.map(e => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px; display: flex; align-items: center; gap: 10px;">
                    <img src="${e.studentID?.profilePic || '../assets/default-avatar.png'}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <div style="font-weight: 600;">${e.studentID?.name}</div>
                        <div style="font-size: 0.75rem; color: #999;">${e.studentID?.email}</div>
                    </div>
                </td>
                <td style="padding: 15px;">${e.courseID?.title}</td>
                <td style="padding: 15px;">${new Date(e.enrolledAt).toLocaleDateString()}</td>
                <td style="padding: 15px;">
                    <div style="width: 100px; height: 6px; background: #eee; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${e.percentComplete || 0}%; height: 100%; background: var(--color-saffron);"></div>
                    </div>
                    <small style="color: var(--color-text-secondary);">${e.percentComplete || 0}%</small>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        list.innerHTML = '<tr><td colspan="4">Error loading insights.</td></tr>';
    }
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