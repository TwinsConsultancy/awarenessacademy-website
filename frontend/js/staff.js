/**
 * InnerSpark - Staff Dashboard Logic
 */

// Navigation function to switch between sections
function switchSection(sectionName) {
    // Hide all sections
    const sections = ['overviewSection', 'coursesSection', 'studentsSection', 'notificationsSection', 'liveSection', 'assessmentsSection', 'ticketsSection', 'profileSection'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = 'none';
    });

    // Show the selected section
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Update active state in nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event?.target?.closest('.nav-link')?.classList.add('active');

    // Load data for the selected section
    if (sectionName === 'overview') {
        loadOverview();
    } else if (sectionName === 'students') {
        loadEnrolledStudents();
    } else if (sectionName === 'notifications') {
        loadNotifications();
    } else if (sectionName === 'live') {
        loadSchedules();
    } else if (sectionName === 'assessments') {
        loadMyAssessments();
    } else if (sectionName === 'tickets') {
        loadMyTickets();
    } else if (sectionName === 'profile') {
        loadProfile();
    }
}

// Make switchSection available globally for onclick attributes IMMEDIATELY
window.switchSection = switchSection;

// Exam Wizard Global Variables and Functions
let currentExamStep = 1;
const totalExamSteps = 4;

function updateExamStepUI() {
    // Hide all steps
    document.querySelectorAll('.exam-step').forEach(step => step.style.display = 'none');

    // Show current step
    const stepEl = document.getElementById(`examStep${currentExamStep}`);
    if (stepEl) stepEl.style.display = 'block';

    // Update step indicators
    document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
        const stepNum = index + 1;
        indicator.classList.remove('active', 'completed');
        if (stepNum < currentExamStep) {
            indicator.classList.add('completed');
        } else if (stepNum === currentExamStep) {
            indicator.classList.add('active');
        }
    });

    // Update navigation buttons
    const prevBtn = document.getElementById('examPrevBtn');
    const nextBtn = document.getElementById('examNextBtn');
    const submitBtn = document.getElementById('examSubmitBtn');

    if (prevBtn) prevBtn.style.display = currentExamStep > 1 ? 'block' : 'none';
    if (nextBtn) nextBtn.style.display = currentExamStep < totalExamSteps ? 'block' : 'none';
    if (submitBtn) submitBtn.style.display = currentExamStep === totalExamSteps ? 'block' : 'none';

    // Generate review if on step 4
    if (currentExamStep === 4) {
        generateExamReview();
    }
}

function validateExamStep(step) {
    switch (step) {
        case 1:
            const courseID = document.getElementById('examCourseSelect')?.value;
            const title = document.getElementById('examTitle')?.value?.trim();
            if (!courseID) {
                UI.error('Please select a course');
                return false;
            }
            if (!title) {
                UI.error('Please enter an assessment title');
                return false;
            }
            return true;

        case 2:
            const duration = document.getElementById('examDuration')?.value;
            const passingScore = document.getElementById('examPassingScore')?.value;
            if (!duration || duration < 5) {
                UI.error('Duration must be at least 5 minutes');
                return false;
            }
            if (!passingScore || passingScore < 0 || passingScore > 100) {
                UI.error('Passing score must be between 0 and 100');
                return false;
            }
            return true;

        case 3:
            const questions = document.querySelectorAll('.q-block');
            if (questions.length === 0) {
                UI.error('Please add at least one question');
                return false;
            }

            // Validate each question
            for (let i = 0; i < questions.length; i++) {
                const block = questions[i];
                const qText = block.querySelector('.q-text')?.value?.trim();
                const opts = Array.from(block.querySelectorAll('.opt-text'));

                if (!qText) {
                    UI.error(`Question ${i + 1}: Please enter the question text`);
                    return false;
                }

                for (let j = 0; j < opts.length; j++) {
                    if (!opts[j].value.trim()) {
                        UI.error(`Question ${i + 1}: Please fill in all options`);
                        return false;
                    }
                }

                // Validate that at least one correct answer is selected
                const correctOptions = Array.from(block.querySelectorAll('.option-label'))
                    .filter(label => label.dataset.correct === 'true');

                if (correctOptions.length === 0) {
                    UI.error(`Question ${i + 1}: Please select at least one correct answer by clicking the option label (A/B/C/D)`);
                    return false;
                }
            }
            return true;

        default:
            return true;
    }
}

function generateExamReview() {
    const courseSelect = document.getElementById('examCourseSelect');
    const courseName = courseSelect?.options[courseSelect.selectedIndex]?.text || 'N/A';
    const title = document.getElementById('examTitle')?.value || 'N/A';
    const duration = document.getElementById('examDuration')?.value || '30';
    const passingScore = document.getElementById('examPassingScore')?.value || '70';
    const threshold = document.getElementById('examThreshold')?.value || '85';
    const questions = document.querySelectorAll('.q-block');

    let reviewHTML = `
        <div style="margin-bottom: 25px;">
            <h4 style="color: var(--color-saffron); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-info-circle"></i> Assessment Details
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Course</div>
                    <div style="font-weight: 600;">${courseName}</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Title</div>
                    <div style="font-weight: 600;">${title}</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Duration</div>
                    <div style="font-weight: 600;">${duration} minutes</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Passing Score</div>
                    <div style="font-weight: 600;">${passingScore}%</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Activation Threshold</div>
                    <div style="font-weight: 600;">${threshold}% progress required</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Total Questions</div>
                    <div style="font-weight: 600;">${questions.length}</div>
                </div>
            </div>
        </div>
        
        <div>
            <h4 style="color: var(--color-saffron); margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-list"></i> Questions Preview
            </h4>
            <div style="max-height: 300px; overflow-y: auto; padding-right: 10px;">
    `;

    questions.forEach((block, index) => {
        const qText = block.querySelector('.q-text')?.value || '';
        const opts = Array.from(block.querySelectorAll('.opt-text')).map(input => input.value);

        // Get all correct answer indices from option labels
        const correctIndices = [];
        const optionLabels = block.querySelectorAll('.option-label');
        optionLabels.forEach((label, idx) => {
            if (label.dataset.correct === 'true') {
                correctIndices.push(idx);
            }
        });

        reviewHTML += `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid var(--color-golden);">
                <div style="font-weight: 600; margin-bottom: 10px; color: #333;">
                    ${index + 1}. ${qText}
                    ${correctIndices.length > 1 ? '<span style="font-size: 0.8rem; color: #666; font-weight: 400;">(Multiple correct answers)</span>' : ''}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-left: 20px;">
                    ${opts.map((opt, i) => {
            const isCorrect = correctIndices.includes(i);
            return `
                        <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: ${isCorrect ? '#d4edda' : '#f8f9fa'}; border-radius: 5px; font-size: 0.9rem; border: ${isCorrect ? '2px solid #28a745' : '1px solid #e0e0e0'};">
                            <span style="background: ${isCorrect ? '#28a745' : '#6c757d'}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold;">
                                ${String.fromCharCode(65 + i)}
                            </span>
                            <span style="flex: 1;">${opt}</span>
                            ${isCorrect ? '<i class="fas fa-check-circle" style="color: #28a745; font-size: 1.1rem;"></i>' : ''}
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;
    });

    reviewHTML += `
            </div>
        </div>
    `;

    const reviewEl = document.getElementById('examReview');
    if (reviewEl) reviewEl.innerHTML = reviewHTML;
}

function resetExamForm() {
    currentExamStep = 1;
    updateExamStepUI();
    const form = document.getElementById('examForm');
    if (form) {
        form.reset();
        // Restore creation handler
        if (window.handleCreateExam) {
            form.onsubmit = window.handleCreateExam;
        }
        // Restore button text
        const btn = document.getElementById('examSubmitBtn');
        if (btn) btn.innerHTML = '<i class="fas fa-check"></i> Create Assessment';
    }
    const container = document.getElementById('questionContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                <i class="fas fa-question-circle" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
                <p>No questions added yet. Click "Add Question" to get started.</p>
            </div>
        `;
    }
    if (typeof qCount !== 'undefined') {
        qCount = 0;
        updateQuestionCount();
    }
    if (typeof currentEditingExamId !== 'undefined') {
        currentEditingExamId = null;
    }
}

/* --- STAFF STEPPER WIZARD FUNCTIONS (Moved before DOMContentLoaded) --- */
let currentStaffStep = 1;

window.staffResetWizard = function () {
    currentStaffStep = 1;
    const courseForm = document.getElementById('courseForm');
    if (courseForm) courseForm.reset();
    // Reset video upload UI
    const vidUrl = document.getElementById('introVideoUrl');
    if (vidUrl) vidUrl.value = '';
    const vidPrev = document.getElementById('videoPreviewContainer');
    if (vidPrev) vidPrev.style.display = 'none';
    const dropCont = document.getElementById('dropzoneContent');
    if (dropCont) dropCont.style.display = 'block';

    // Only call updateStaffStepUI if it exists (defined later)
    if (typeof updateStaffStepUI === 'function') {
        updateStaffStepUI();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify Auth
    const authData = Auth.checkAuth(['Staff']);
    if (!authData) return;

    const { user } = authData;

    // Set staff name and avatar in top header
    if (user) {
        document.getElementById('staffName').textContent = user.name || 'Mentor';
        const avatar = document.getElementById('staffAvatar');
        avatar.textContent = (user.name || 'M').charAt(0).toUpperCase();
    }

    // 2. Modals Logic
    const courseModal = document.getElementById('courseModal');
    const uploadModal = document.getElementById('uploadModal');

    document.getElementById('newCourseBtn').addEventListener('click', () => {
        staffResetWizard();
        courseModal.style.display = 'flex';
    });
    document.getElementById('closeModal').addEventListener('click', () => courseModal.style.display = 'none');
    document.getElementById('closeUploadModal').addEventListener('click', () => uploadModal.style.display = 'none');

    // Intro Video Upload Logic
    const introDropzone = document.getElementById('introVideoDropzone');
    const introInput = document.getElementById('introVideoInput');
    const introHidden = document.getElementById('introVideoUrl');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const uploadStatus = document.getElementById('uploadStatus');
    const videoPreview = document.getElementById('videoPreviewContainer');
    // const previewPlayer = document.getElementById('previewPlayer');
    const removeBtn = document.getElementById('removeVideoBtn');
    const dropzoneContent = document.getElementById('dropzoneContent');

    if (introInput) {
        introInput.addEventListener('change', handleIntroUpload);

        // Drag & Drop visual feedback
        introDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            introDropzone.style.borderColor = 'var(--color-saffron)';
            introDropzone.style.background = 'rgba(0,0,0,0.02)';
        });
        introDropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            introDropzone.style.borderColor = '#ddd';
            introDropzone.style.background = 'white';
        });
        introDropzone.addEventListener('drop', (e) => {
            introDropzone.style.borderColor = '#ddd';
            introDropzone.style.background = 'white';
        });

        removeBtn.addEventListener('click', () => {
            introInput.value = '';
            introHidden.value = '';
            videoPreview.style.display = 'none';
            // previewPlayer.src = '';
            dropzoneContent.style.display = 'block';
            uploadProgress.style.display = 'none';
        });
    }

    async function handleIntroUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Reset UI
        uploadProgress.style.display = 'block';
        progressBar.style.width = '0%';
        uploadStatus.textContent = 'Uploading...';
        dropzoneContent.style.display = 'none';

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Fake progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progress > 90) clearInterval(interval);
                progressBar.style.width = `${progress}%`;
            }, 200);

            const res = await fetch(`${Auth.apiBase}/uploads/content`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            clearInterval(interval);
            progressBar.style.width = '100%';

            if (res.ok) {
                const data = await res.json();
                uploadStatus.textContent = 'Upload Complete';
                introHidden.value = data.url;

                // Show Preview
                document.getElementById('videoPreview').style.display = 'block';
                document.getElementById('videoLink').href = data.url;
                videoPreview.style.display = 'block';
                // previewPlayer.src = data.url;
                uploadProgress.style.display = 'none';
            } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Upload failed');
            }
        } catch (err) {
            UI.handleError(err, 'Intro Upload', 'Video upload failed. Please try a different file or format.');
            dropzoneContent.style.display = 'block';
        }
    }

    // 3. Load Overview (Default) and Courses
    loadOverview();
    loadCourses();
    checkDeletedCourses();


    // 5. Upload Content
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        console.log('📤 Upload initiated...');
        console.log('Form data entries:', Array.from(formData.entries()));

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
            console.log('📡 Sending request to:', `${Auth.apiBase}/courses/materials/upload`);

            const res = await fetch(`${Auth.apiBase}/courses/materials/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            console.log('📥 Response status:', res.status);

            if (res.ok) {
                const data = await res.json();
                console.log('✅ Upload successful:', data);
                UI.success("Material uploaded successfully! Awaiting admin approval.");
                uploadModal.style.display = 'none';
                e.target.reset();
                // Reload materials if on materials section
                if (currentSection === 'materials') {
                    loadMyMaterials();
                }
            } else {
                const err = await res.json().catch(() => ({}));
                console.error('❌ Upload failed:', err);
                UI.error('Upload failed: ' + (err.message || 'Server error. Please try again.'));
            }
        } catch (err) {
            UI.handleError(err, 'Material Upload', 'Failed to upload material. Please check your connection.');
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

    // 6. Create Exam - Multi-Step Wizard Event Listeners

    // Navigation buttons
    document.getElementById('examNextBtn').addEventListener('click', () => {
        if (validateExamStep(currentExamStep)) {
            currentExamStep++;
            updateExamStepUI();
        }
    });

    document.getElementById('examPrevBtn').addEventListener('click', () => {
        currentExamStep--;
        updateExamStepUI();
    });

    // Form submission - assign to global var to allow overwrite/restore
    window.handleCreateExam = async function (e) {
        e.preventDefault();

        if (!validateExamStep(3)) return;

        const formData = new FormData(e.target);
        const data = {
            courseID: formData.get('courseID'),
            title: formData.get('title'),
            duration: parseInt(formData.get('duration')),
            passingScore: parseInt(formData.get('passingScore')),
            activationThreshold: parseInt(formData.get('activationThreshold')),
            questions: []
        };

        const qBlocks = document.querySelectorAll('.q-block');
        qBlocks.forEach(block => {
            const q = block.querySelector('.q-text').value;
            const opts = Array.from(block.querySelectorAll('.opt-text')).map(input => input.value);

            // Collect all correct answer indices from option labels
            const correctIndices = [];
            const optionLabels = block.querySelectorAll('.option-label');
            optionLabels.forEach((label, index) => {
                if (label.dataset.correct === 'true') {
                    correctIndices.push(index);
                }
            });

            data.questions.push({
                question: q,
                options: opts,
                correctAnswerIndices: correctIndices
            });
        });

        try {
            UI.showLoader();
            const res = await fetch(`${Auth.apiBase}/exams/create`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                UI.success('Assessment created successfully!');
                document.getElementById('examModal').style.display = 'none';
                resetExamForm();
                if (window.loadMyAssessments) loadMyAssessments();
            } else {
                const result = await res.json().catch(() => ({}));
                UI.error(result.message || 'Assessment creation failed');
            }
        } catch (err) {
            UI.handleError(err, 'Exam Creation');
        }
        finally { UI.hideLoader(); }
    };

    // Initialize form handler
    const examForm = document.getElementById('examForm');
    if (examForm) {
        examForm.onsubmit = window.handleCreateExam;
    }

    // Initialize wizard UI on page load
    setTimeout(() => {
        updateExamStepUI();
    }, 100);

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
            } else {
                const errData = await res.json().catch(() => ({}));
                UI.error(errData.message || 'Scheduling failed');
            }
        } catch (err) {
            UI.handleError(err, 'Scheduling');
        }
        finally { UI.hideLoader(); }
    });

    document.getElementById('closeScheduleModal').addEventListener('click', () => {
        document.getElementById('scheduleModal').style.display = 'none';
    });
});

let currentSection = 'overview';

// Load Overview Statistics
async function loadOverview() {
    const container = document.getElementById('overviewStats');

    try {
        // Fetch all required data in parallel
        const [coursesRes, studentsRes, modulesRes] = await Promise.all([
            fetch(`${Auth.apiBase}/staff/courses`, { headers: Auth.getHeaders() }),
            fetch(`${Auth.apiBase}/staff/students`, { headers: Auth.getHeaders() }),
            fetch(`${Auth.apiBase}/staff/modules`, { headers: Auth.getHeaders() })
        ]);

        const courses = await coursesRes.json();
        const enrollments = await studentsRes.json();
        const modules = await modulesRes.json();

        // Calculate statistics
        const totalCourses = courses.length;
        const publishedCourses = courses.filter(c => c.status === 'Published').length;
        const draftCourses = courses.filter(c => c.status === 'Draft').length;
        const approvedCourses = courses.filter(c => c.status === 'Approved').length;

        const uniqueStudents = new Set(enrollments.map(e => e.studentID?._id).filter(id => id)).size;
        const totalEnrollments = enrollments.length;

        const totalModules = modules.length;
        const approvedModules = modules.filter(m => m.status === 'Approved').length;
        const pendingModules = modules.filter(m => m.status === 'Pending').length;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; margin-bottom: 30px;">
                <!-- Courses Card -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; color: white; box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">Total Courses</div>
                            <div style="font-size: 2.5rem; font-weight: bold;">${totalCourses}</div>
                        </div>
                        <i class="fas fa-book-open" style="font-size: 3rem; opacity: 0.3;"></i>
                    </div>
                    <div style="display: flex; gap: 15px; font-size: 0.85rem;">
                        <span><i class="fas fa-check-circle"></i> ${publishedCourses} Published</span>
                        <span><i class="fas fa-clock"></i> ${draftCourses} Draft</span>
                    </div>
                </div>

                <!-- Students Card -->
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 15px; color: white; box-shadow: 0 10px 25px rgba(240, 147, 251, 0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">Total Students</div>
                            <div style="font-size: 2.5rem; font-weight: bold;">${uniqueStudents}</div>
                        </div>
                        <i class="fas fa-users" style="font-size: 3rem; opacity: 0.3;"></i>
                    </div>
                    <div style="font-size: 0.85rem;">
                        <i class="fas fa-graduation-cap"></i> ${totalEnrollments} Total Enrollments
                    </div>
                </div>

                <!-- Modules Card -->
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 15px; color: white; box-shadow: 0 10px 25px rgba(79, 172, 254, 0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">Total Modules</div>
                            <div style="font-size: 2.5rem; font-weight: bold;">${totalModules}</div>
                        </div>
                        <i class="fas fa-layer-group" style="font-size: 3rem; opacity: 0.3;"></i>
                    </div>
                    <div style="display: flex; gap: 15px; font-size: 0.85rem;">
                        <span><i class="fas fa-check"></i> ${approvedModules} Approved</span>
                        <span><i class="fas fa-hourglass-half"></i> ${pendingModules} Pending</span>
                    </div>
                </div>
            </div>

            <!-- Recent Activity Section -->
            <div style="background: white; border-radius: 15px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
                <h4 style="margin-bottom: 20px; color: #333;"><i class="fas fa-chart-line"></i> Quick Stats</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--color-success);">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">Approved Courses</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--color-success);">${approvedCourses}</div>
                    </div>
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--color-saffron);">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">Avg. Students/Course</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--color-saffron);">${totalCourses > 0 ? Math.round(totalEnrollments / totalCourses) : 0}</div>
                    </div>
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #17a2b8;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">Modules per Course</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #17a2b8;">${totalCourses > 0 ? Math.round(totalModules / totalCourses) : 0}</div>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        UI.handleError(err, 'Overview Stats', 'Failed to load dashboard statistics.');
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;"><i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px;"></i><p>Failed to load dashboard statistics. Please refresh the page.</p></div>';
    }
}

async function loadEnrolledStudents() {
    const list = document.getElementById('studentInsightList');
    const filterDropdown = document.getElementById('studentCourseFilter');

    // Show loading message
    list.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center; color: var(--color-text-secondary);">Loading student insights...</td></tr>';

    try {
        console.log('Loading enrolled students...');
        const res = await fetch(`${Auth.apiBase}/staff/students`, { headers: Auth.getHeaders() });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const enrollments = await res.json();
        console.log('Received enrollments:', enrollments);

        if (!enrollments || enrollments.length === 0) {
            list.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center;">No seekers have joined your paths yet.</td></tr>';
            if (filterDropdown) {
                filterDropdown.innerHTML = '<option value="">All Courses</option>';
            }
            return;
        }

        // Extract unique courses from enrollments
        const uniqueCourses = [...new Map(
            enrollments
                .filter(e => e.courseID && e.courseID._id)
                .map(e => [e.courseID._id, e.courseID])
        ).values()];

        console.log('Unique courses found:', uniqueCourses.length);

        // Populate filter dropdown with courses
        if (filterDropdown) {
            filterDropdown.innerHTML = '<option value="">All Courses</option>' +
                uniqueCourses.map(course =>
                    `<option value="${course._id}">${course.title}</option>`
                ).join('');
        }

        // Extract and populate unique students for the new filter
        const uniqueStudents = [...new Map(
            enrollments
                .filter(e => e.studentID && e.studentID._id)
                .map(e => [e.studentID._id, e.studentID])
        ).values()];

        const studentNameFilter = document.getElementById('studentNameFilter');
        if (studentNameFilter) {
            studentNameFilter.innerHTML = '<option value="">All Students</option>' +
                uniqueStudents.map(student =>
                    `<option value="${student._id}">${student.name} (${student.email})</option>`
                ).join('');
        }

        list.innerHTML = enrollments.map((e, index) => {
            // Handle missing data gracefully
            const studentName = e.studentID?.name || 'Unknown Student';
            const studentEmail = e.studentID?.email || 'No email';
            const studentId = e.studentID?.studentID || 'N/A';
            const courseTitle = e.courseID?.title || 'Unknown Course';
            const enrolledDate = e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : 'Unknown';
            const progress = e.percentComplete || 0;

            return `
                <tr style="border-bottom: 1px solid #eee; background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};" data-course-id="${e.courseID?._id || ''}" data-student-id="${e.studentID?._id || ''}">
                    <td style="padding: 15px; text-align: center; color: #666;">${index + 1}</td>
                    <td style="padding: 15px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${e.studentID?.profilePic || '../assets/default-avatar.png'}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div style="font-weight: 600;">${studentName}</div>
                                <div style="font-size: 0.75rem; color: #999;">${studentEmail}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 15px; color: #666; font-family: monospace; font-weight: 600;">${studentId}</td>
                    <td style="padding: 15px;">${courseTitle}</td>
                    <td style="padding: 15px;">${enrolledDate}</td>
                    <td style="padding: 15px;">
                        <div style="width: 100px; height: 6px; background: #eee; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${progress}%; height: 100%; background: var(--color-saffron);"></div>
                        </div>
                        <small style="color: var(--color-text-secondary);">${progress}%</small>
                    </td>
                </tr>
            `;
        }).join('');

        console.log('Student insights loaded successfully');

        if (res.ok) {
            UI.success('Student insights loaded');
        } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to fetch student insights');
        }
    } catch (err) {
        UI.handleError(err, 'Student Insights', 'Failed to load student insights. Please try again.');
        list.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center; color: var(--color-error);">Error loading student online metrics.</td></tr>';
        if (filterDropdown) {
            filterDropdown.innerHTML = '<option value="">All Courses</option>';
        }
    }
}

async function loadSchedules() {
    const list = document.getElementById('scheduleList');
    try {
        const res = await fetch(`${Auth.apiBase}/schedules/my-timetable`, { headers: Auth.getHeaders() });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to fetch schedules');
        }
        const schedules = await res.json();
        if (schedules.length === 0) {
            list.innerHTML = '<p>No live flows scheduled.</p>';
            return;
        }
        list.innerHTML = schedules.map(s => {
            const now = new Date();
            const startTime = new Date(s.startTime);
            const endTime = new Date(s.endTime);
            
            let statusColor = '#3B82F6'; // Default blue for upcoming
            let statusLabel = 'Upcoming';
            
            if (now >= startTime && now <= endTime) {
                statusColor = '#10B981'; // Green for live
                statusLabel = 'Live Now';
            } else if (now > endTime) {
                statusColor = '#6B7280'; // Gray for completed
                statusLabel = 'Completed';
            }

            return `
            <div class="course-list-item" style="border-left: 4px solid ${statusColor};">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <strong>${s.title}</strong>
                        <span style="font-size: 0.7rem; padding: 2px 8px; border-radius: 12px; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}; font-weight: 600;">
                            ${statusLabel}
                        </span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 5px;">
                        <i class="far fa-calendar-alt"></i> ${new Date(s.startTime).toLocaleString()} | <i class="fas fa-book"></i> Course: ${s.courseID?.title || 'Unknown'}
                    </p>
                </div>
                <div>
                    <button class="btn-primary" onclick="startLiveSession('${s.meetingLink || s._id}')" style="background: var(--color-saffron); padding: 6px 16px; font-size: 0.85rem; border: none; border-radius: 8px;">
                        <i class="fas fa-video"></i> Start Class
                    </button>
                </div>
            </div>
            `;
        }).join('');
    } catch (err) {
        UI.handleError(err, 'Live Schedules', 'Failed to load your schedules.');
        list.innerHTML = '<p style="color: var(--color-error);">Error loading schedules.</p>';
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

function updateQuestionCount() {
    const count = document.querySelectorAll('.q-block').length;
    document.getElementById('questionCount').textContent = `(${count})`;
}

function addQuestionField() {
    qCount++;
    const container = document.getElementById('questionContainer');

    // Remove empty state message if exists
    if (container.querySelector('div[style*="text-align: center"]')) {
        container.innerHTML = '';
    }

    const div = document.createElement('div');
    div.className = 'q-block';
    div.dataset.questionId = qCount;

    div.innerHTML = `
        <div class="q-block-header">
            <div class="q-block-number">
                <i class="fas fa-question-circle"></i> Question ${qCount}
            </div>
            <button type="button" class="q-delete-btn" onclick="deleteQuestion(this)">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
        
        <div class="form-group">
            <label style="font-weight: 600; color: #333;">Question Text *</label>
            <textarea class="form-control q-text" placeholder="Enter your question here..." 
                      required style="min-height: 80px; resize: vertical;"></textarea>
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="font-weight: 600; color: #333; margin-bottom: 10px; display: block;">
                Answer Options * 
                <small style="font-weight: 400; color: #666; font-size: 0.85rem;">
                    (Click option label to mark as correct)
                </small>
            </label>
            <div class="option-input-group" data-option="A" data-index="0">
                <div class="option-label" onclick="toggleCorrectAnswer(this)" data-correct="false">A</div>
                <input type="text" class="opt-text form-control" placeholder="Enter option A" required>
            </div>
            <div class="option-input-group" data-option="B" data-index="1">
                <div class="option-label" onclick="toggleCorrectAnswer(this)" data-correct="false">B</div>
                <input type="text" class="opt-text form-control" placeholder="Enter option B" required>
            </div>
            <div class="option-input-group" data-option="C" data-index="2">
                <div class="option-label" onclick="toggleCorrectAnswer(this)" data-correct="false">C</div>
                <input type="text" class="opt-text form-control" placeholder="Enter option C" required>
            </div>
            <div class="option-input-group" data-option="D" data-index="3">
                <div class="option-label" onclick="toggleCorrectAnswer(this)" data-correct="false">D</div>
                <input type="text" class="opt-text form-control" placeholder="Enter option D" required>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 10px 15px; border-radius: 8px; font-size: 0.85rem; color: #666; border-left: 3px solid var(--color-golden);">
            <i class="fas fa-info-circle"></i> 
            <strong>Note:</strong> Click option labels (A/B/C/D) to mark correct answers. 
            Multiple selections allowed for questions with more than one correct answer.
        </div>
    `;

    container.appendChild(div);

    // Scroll to the new question  
    setTimeout(() => {
        div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    updateQuestionCount();
}

function toggleCorrectAnswer(labelElement) {
    const isCorrect = labelElement.dataset.correct === 'true';

    if (isCorrect) {
        // Deselect
        labelElement.dataset.correct = 'false';
        labelElement.style.background = '#ff9800'; // Orange
        labelElement.style.borderColor = '#ff9800';
    } else {
        // Select
        labelElement.dataset.correct = 'true';
        labelElement.style.background = '#28a745'; // Green
        labelElement.style.borderColor = '#28a745';
    }

    // Add a subtle animation
    labelElement.style.transform = 'scale(1.1)';
    setTimeout(() => {
        labelElement.style.transform = 'scale(1)';
    }, 150);
}

function deleteQuestion(btn) {
    if (confirm('Are you sure you want to delete this question?')) {
        const block = btn.closest('.q-block');
        block.style.transition = 'all 0.3s ease';
        block.style.opacity = '0';
        block.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            block.remove();
            renumberQuestions();
            updateQuestionCount();

            // Show empty state if no questions left
            const container = document.getElementById('questionContainer');
            if (container.querySelectorAll('.q-block').length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                        <i class="fas fa-question-circle" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
                        <p>No questions added yet. Click "Add Question" to get started.</p>
                    </div>
                `;
            }
        }, 300);
    }
}

function renumberQuestions() {
    const questions = document.querySelectorAll('.q-block');
    questions.forEach((block, index) => {
        const numberEl = block.querySelector('.q-block-number');
        numberEl.innerHTML = `<i class="fas fa-question-circle"></i> Question ${index + 1}`;
    });
}

// --- Staff Course Card Helpers ---
const _staffStatusColors = {
    'Published': { bg: '#e6f4ea', text: '#1e7e34' },
    'Approved': { bg: '#e6f4ea', text: '#1e7e34' },
    'Draft': { bg: '#fff3cd', text: '#856404' },
    'Pending': { bg: '#fff3cd', text: '#856404' },
    'Rejected': { bg: '#f8d7da', text: '#721c24' },
};
function _staffStatusColor(s) { return _staffStatusColors[s] || _staffStatusColors['Draft']; }

function _getStaffThumbnail(thumb) {
    if (!thumb) return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80';
    if (thumb.startsWith('http')) return thumb;
    return `${Auth.apiBase.replace('/api', '')}/${thumb}`;
}

// Debounce helper for search
let _staffCourseSearchTimer;
function _debounceStaffCourses() {
    clearTimeout(_staffCourseSearchTimer);
    _staffCourseSearchTimer = setTimeout(loadCourses, 280);
}

async function loadCourses() {
    const list = document.getElementById('courseList');
    const search = (document.getElementById('courseSearchInput')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('courseStatusFilter')?.value || '';

    list.innerHTML = `
        <div style="text-align:center; padding:40px; color:#999;">
            <i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:12px;"></i>
            <p>Loading your courses...</p>
        </div>`;

    try {
        const res = await fetch(`${Auth.apiBase}/staff/courses`, { headers: Auth.getHeaders() });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to fetch courses');
        }
        let courses = await res.json();
        localStorage.setItem('staffCourses', JSON.stringify(courses));

        // Client-side filter
        if (search) {
            courses = courses.filter(c =>
                (c.title || '').toLowerCase().includes(search) ||
                (c.category || '').toLowerCase().includes(search)
            );
        }
        if (statusFilter) {
            courses = courses.filter(c => {
                const ds = c.approvalStatus && c.approvalStatus !== 'Approved' ? c.approvalStatus : c.status;
                return ds === statusFilter;
            });
        }

        if (courses.length === 0) {
            list.innerHTML = `
                <div style="text-align:center; padding:60px 20px; color:#999;">
                    <i class="fas fa-swatchbook" style="font-size:3rem; opacity:0.3; margin-bottom:16px;"></i>
                    <p style="font-size:1rem; margin-bottom:8px;">No courses found.</p>
                    <p style="font-size:0.85rem;">Try a different filter or create your first course.</p>
                </div>`;
            return;
        }

        // Ensure responsive style is present (inject once)
        if (!document.getElementById('_staffCoursesStyle')) {
            const s = document.createElement('style');
            s.id = '_staffCoursesStyle';
            s.textContent = `
                #staffCourseGrid { display:grid; gap:22px; grid-template-columns: repeat(4, 1fr); }
                @media (max-width: 1200px) { #staffCourseGrid { grid-template-columns: repeat(3, 1fr); } }
                @media (max-width: 860px)  { #staffCourseGrid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 540px)  { #staffCourseGrid { grid-template-columns: 1fr; } }
            `;
            document.head.appendChild(s);
        }

        list.innerHTML = `<div id="staffCourseGrid">
                ${courses.map(c => {
            let displayStatus = c.status || 'Draft';
            if (c.approvalStatus && c.approvalStatus !== 'Approved') {
                displayStatus = c.approvalStatus;
            } else if (c.approvalStatus === 'Approved' && c.status === 'Draft') {
                displayStatus = 'Approved';
            }
            const sc = _staffStatusColor(displayStatus);
            const thumb = _getStaffThumbnail(c.thumbnail);
            const mentorNames = (c.mentors && c.mentors.length > 0)
                ? c.mentors.map(m => m.name || m).join(', ')
                : 'No Mentors';

            return `
                    <div class="glass-card" style="padding:0; border-radius:14px; overflow:hidden; display:flex; flex-direction:column; transition:transform 0.2s, box-shadow 0.2s;"
                        onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 24px rgba(0,0,0,0.10)';"
                        onmouseout="this.style.transform='none'; this.style.boxShadow='none';">

                        <!-- Thumbnail Banner -->
                        <div style="height:150px; background:url('${thumb}') center/cover no-repeat; position:relative; background-color:#f0ece4;">
                            <div style="position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.45) 100%);"></div>
                            <!-- Status badge on thumbnail -->
                            <span style="position:absolute; top:12px; right:12px; background-color:${sc.bg}; color:${sc.text}; padding:5px 12px; border-radius:20px; font-size:0.72rem; font-weight:700; letter-spacing:0.4px;">
                                ${displayStatus}
                            </span>
                            <!-- Price badge -->
                            <span style="position:absolute; bottom:12px; left:12px; background:rgba(0,0,0,0.7); color:#ffd700; padding:4px 10px; border-radius:8px; font-weight:700; font-size:0.85rem;">
                                ₹${c.price ?? 'Free'}
                            </span>
                        </div>

                        <!-- Card Body -->
                        <div style="padding:18px 18px 14px; flex:1; display:flex; flex-direction:column; gap:10px;">
                            <div style="font-weight:700; font-size:1.05rem; color:var(--color-text-primary); line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                                ${c.title}
                            </div>
                            <div style="display:flex; flex-direction:column; gap:6px; font-size:0.82rem; color:#666;">
                                <span><i class="fas fa-folder-open" style="color:#bbb; margin-right:7px; width:14px;"></i>${c.category || 'General'}</span>
                                <span><i class="fas fa-clock" style="color:#bbb; margin-right:7px; width:14px;"></i>${c.duration || 'N/A'}</span>
                                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    <i class="fas fa-user-tie" style="color:#bbb; margin-right:7px; width:14px;"></i>${mentorNames}
                                </span>
                            </div>
                        </div>

                        <!-- Card Actions -->
                        <div style="padding:12px 18px; border-top:1px solid #f0f0f0; display:flex; gap:8px; flex-wrap:wrap;">
                            <a href="course-preview.html?id=${c._id}"
                                style="flex:1; text-align:center; text-decoration:none; padding:7px 0; font-size:0.82rem; font-weight:600; border-radius:20px; border:1px solid var(--color-saffron); color:var(--color-saffron); background:#fffaf0; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:all 0.2s;"
                                onmouseover="this.style.background='var(--color-saffron)'; this.style.color='white';"
                                onmouseout="this.style.background='#fffaf0'; this.style.color='var(--color-saffron)';">
                                <i class="fas fa-play-circle"></i> Preview
                            </a>
                            <a href="module-manager.html?courseId=${c._id}"
                                style="flex:1.4; text-align:center; text-decoration:none; padding:7px 0; font-size:0.82rem; font-weight:600; border-radius:20px; border:1px solid var(--color-golden); color:var(--color-golden); background:#fffef5; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:all 0.2s;"
                                onmouseover="this.style.background='var(--color-golden)'; this.style.color='white';"
                                onmouseout="this.style.background='#fffef5'; this.style.color='var(--color-golden)';">
                                <i class="fas fa-layer-group"></i> Manage Modules
                            </a>
                        </div>
                    </div>`;
        }).join('')}
            </div>`;

    } catch (err) {
        UI.handleError(err, 'Course List', 'Failed to load your projects.');
    }
}

async function checkDeletedCourses() {
    // This function is now deprecated - notifications are loaded via loadNotifications()
    // Keeping this function to avoid breaking references, but it does nothing
    console.log('checkDeletedCourses called - now using notification system instead');
}

document.getElementById('newExamBtn').addEventListener('click', () => {
    const select = document.getElementById('examCourseSelect');
    const courses = JSON.parse(localStorage.getItem('staffCourses') || '[]');
    select.innerHTML = '<option value="">Choose a course...</option>' +
        courses.map(c => `<option value="${c._id}">${c.title}</option>`).join('');
    resetExamForm();
    document.getElementById('examModal').style.display = 'flex';
});

document.getElementById('closeExamModal').addEventListener('click', () => {
    document.getElementById('examModal').style.display = 'none';
    resetExamForm();
});

function openScheduleModal() {
    const select = document.getElementById('scheduleCourseSelect');
    const courses = JSON.parse(localStorage.getItem('staffCourses') || '[]');
    select.innerHTML = courses.map(c => `<option value="${c._id}">${c.title}</option>`).join('');
    document.getElementById('scheduleModal').style.display = 'flex';
}
// My Materials Management - Now shows all modules
async function loadMyMaterials() {
    try {
        UI.showLoader();
        const res = await fetch(`${Auth.apiBase}/staff/modules`, { headers: Auth.getHeaders() });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to load modules');
        }
        const modules = await res.json();
        const list = document.getElementById('myMaterialsList');
        window.staffModules = modules;
        if (modules.length === 0) {
            list.innerHTML = `
                <div class="glass-card" style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 3rem; margin-bottom: 15px; color: var(--color-text-secondary); opacity: 0.5;"><i class="fas fa-book-open"></i></div>
                    <h4 style="color: var(--color-text-secondary); margin-bottom: 10px;">No Modules Yet</h4>
                    <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 20px;">You haven't created any modules yet. Create your first module to get started!</p>
                    <button onclick="switchSection('modules')" class="btn-primary" style="border: none; cursor: pointer; padding: 12px 24px;"><i class="fas fa-plus"></i> Create Module</button>
                </div>
            `;
            return;
        }
        const courseFilter = document.getElementById('materialCourseFilter');
        if (courseFilter) {
            const uniqueCourses = [...new Map(modules.map(m => [m.courseId?._id, m.courseId])).values()];
            courseFilter.innerHTML = '<option value="">All Courses</option>' +
                uniqueCourses.filter(c => c).map(course => `<option value="${course._id}">${course.title}</option>`).join('');
        }
        const modulesByCourse = {};
        modules.forEach(module => {
            const courseId = module.courseId?._id || 'uncategorized';
            const courseTitle = module.courseId?.title || 'Uncategorized';
            if (!modulesByCourse[courseId]) modulesByCourse[courseId] = { title: courseTitle, modules: [] };
            modulesByCourse[courseId].modules.push(module);
        });
        Object.values(modulesByCourse).forEach(course => { course.modules.sort((a, b) => (a.order || 0) - (b.order || 0)); });
        list.innerHTML = Object.entries(modulesByCourse).map(([courseId, course]) => `
            <div class="course-group-container" data-course-id="${courseId}" style="margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--color-golden);">
                    <i class="fas fa-graduation-cap" style="color: var(--color-golden); font-size: 1.2rem;"></i>
                    <h4 style="margin: 0; color: #333; font-size: 1.1rem;">${course.title}</h4>
                    <span style="background: rgba(212, 165, 58, 0.1); color: var(--color-golden); padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                        ${course.modules.length} module${course.modules.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div style="display: grid; gap: 12px;">
                    ${course.modules.map(module => renderModuleCard(module)).join('')}
                </div>
            </div>
        `).join('');
    } catch (err) {
        UI.handleError(err, 'Materials List', 'Failed to load your modules.');
    } finally {
        UI.hideLoader();
    }
}

function renderModuleCard(module) {
    const statusColors = {
        'Published': '#28a745',
        'Approved': '#17a2b8',
        'Draft': '#ffc107',
        'Pending': '#ffc107'
    };

    const contentTypeIcons = {
        'video': { icon: 'fa-video', color: '#856404', label: 'Video' },
        'pdf': { icon: 'fa-file-pdf', color: '#721c24', label: 'PDF' },
        'rich-content': { icon: 'fa-align-left', color: '#0056b3', label: 'Content' }
    };

    const typeInfo = contentTypeIcons[module.contentType] || contentTypeIcons['rich-content'];
    const statusColor = statusColors[module.status] || '#6c757d';

    // Extract courseId properly (handle both object and string)
    const courseIdValue = module.courseId?._id || module.courseId || '';

    return `
        <div class="module-card" data-module-id="${module._id}" data-course-title="${module.courseId?.title || ''}" data-content-type="${module.contentType || 'rich-content'}">
            <div style="display: flex; gap: 15px; align-items: flex-start; padding: 15px; background: white; border-radius: 10px; border: 1px solid #e0e0e0; transition: all 0.3s;">
                <div style="flex-shrink: 0; width: 40px; height: 40px; background: rgba(212, 165, 58, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${typeInfo.icon}" style="color: ${typeInfo.color}; font-size: 1.2rem;" title="${typeInfo.label}"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                        <span style="background: rgba(0, 0, 0, 0.05); color: #666; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                            #${(module.order || 0) + 1}
                        </span>
                        <h5 style="margin: 0; font-size: 1rem; color: #212529; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;" title="${module.title}">
                            ${module.title}
                        </h5>
                    </div>
                    ${module.description ? `
                        <p style="font-size: 0.85rem; color: #6c757d; margin: 8px 0 0 0; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                            ${module.description}
                        </p>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                        <span style="font-size: 0.8rem; color: ${statusColor}; font-weight: 600;">
                            <i class="fas fa-circle" style="font-size: 0.4rem; margin-right: 5px;"></i>${module.status}
                        </span>
                        <span style="font-size: 0.8rem; color: #999;">
                            <i class="fas fa-clock" style="margin-right: 5px;"></i>${new Date(module.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;">
                    <button onclick="viewModuleInManager('${courseIdValue}', '${module._id}')" class="icon-btn" title="View in Module Manager" style="padding: 8px 12px; background: var(--color-golden); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; white-space: nowrap; transition: all 0.3s;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Function to open module edit modal
window.viewModuleInManager = async function (courseId, moduleId) {
    if (!courseId || !moduleId) {
        UI.error('Module information not available');
        console.error('Missing IDs - courseId:', courseId, 'moduleId:', moduleId);
        return;
    }

    try {
        UI.showLoader();

        console.log('Loading module for editing - courseId:', courseId, 'moduleId:', moduleId);

        // Fetch module details
        const res = await fetch(`${Auth.apiBase}/modules/${moduleId}`, {
            headers: Auth.getHeaders()
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('API Error:', res.status, errorText);
            throw new Error('Failed to load module');
        }

        const module = await res.json();
        console.log('Module loaded successfully:', module);

        // Populate the modal
        document.getElementById('editModuleId').value = module._id;
        // Extract courseId properly (handle if it's an object reference)
        const extractedCourseId = module.courseId?._id || module.courseId || courseId;
        document.getElementById('editModuleCourseId').value = extractedCourseId;

        console.log('Set hidden inputs - moduleId:', module._id, 'courseId:', extractedCourseId);

        document.getElementById('editModuleTitle').value = module.title || '';
        document.getElementById('editModuleDescription').value = module.description || '';
        document.getElementById('editModuleDuration').value = module.minDuration || 10;

        // Display module info card
        const contentTypeIcons = {
            'video': { icon: 'fa-video', color: '#856404', label: 'Video' },
            'pdf': { icon: 'fa-file-pdf', color: '#721c24', label: 'PDF' },
            'rich-content': { icon: 'fa-align-left', color: '#0056b3', label: 'Rich Content' }
        };

        const statusColors = {
            'Published': '#28a745',
            'Approved': '#17a2b8',
            'Draft': '#ffc107',
            'Pending': '#ffc107'
        };

        const typeInfo = contentTypeIcons[module.contentType] || contentTypeIcons['rich-content'];
        const statusColor = statusColors[module.status] || '#6c757d';

        // Update info card
        document.getElementById('editModuleInfoCard').style.display = 'block';
        document.getElementById('editModuleIcon').className = `fas ${typeInfo.icon}`;
        document.getElementById('editModuleIcon').style.color = typeInfo.color;
        document.getElementById('editModuleCurrentTitle').textContent = module.title || 'Untitled Module';
        document.getElementById('editModuleCurrentStatus').textContent = module.status || 'Draft';
        document.getElementById('editModuleCurrentStatus').style.color = statusColor;
        document.getElementById('editModuleCurrentContentType').textContent = typeInfo.label;
        document.getElementById('editModuleCurrentContentType').style.color = typeInfo.color;

        // Display content preview
        displayContentPreview(module);

        // Show modal
        document.getElementById('editModuleModal').style.display = 'flex';

    } catch (err) {
        console.error('Failed to load module:', err);
        UI.error('Failed to load module details');
    } finally {
        UI.hideLoader();
    }
};

// Display content preview in edit modal
function displayContentPreview(module) {
    const previewContainer = document.getElementById('editModuleContentPreview');
    if (!previewContainer) return;

    const contentType = module.contentType || 'rich-content';

    if (contentType === 'rich-content') {
        // Show text preview
        const content = module.content || '';
        const textContent = content.replace(/<[^>]*>/g, ''); // Strip HTML tags
        const preview = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '');

        previewContainer.innerHTML = `
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 3px solid #0056b3;">
                <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px; font-weight: 600;">
                    <i class="fas fa-align-left" style="color: #0056b3;"></i> Content Preview:
                </div>
                <div style="font-size: 0.85rem; color: #333; line-height: 1.5; font-style: ${preview ? 'normal' : 'italic'};">
                    ${preview || 'No content yet. Click "Edit Content" to add content.'}
                </div>
            </div>
        `;
    } else if (contentType === 'video' && module.fileUrl) {
        // Show video file info
        const fileName = module.fileMetadata?.originalName || 'Video file';
        const fileSize = module.fileMetadata?.fileSize
            ? (module.fileMetadata.fileSize / (1024 * 1024)).toFixed(2) + ' MB'
            : 'Unknown size';

        previewContainer.innerHTML = `
            <div style="background: #fff3cd; padding: 12px; border-radius: 8px; border-left: 3px solid #856404;">
                <div style="font-size: 0.8rem; color: #856404; margin-bottom: 8px; font-weight: 600;">
                    <i class="fas fa-video" style="color: #856404;"></i> Video Content:
                </div>
                <div style="display: flex; align-items: center; gap: 10px; background: white; padding: 10px; border-radius: 6px;">
                    <div style="width: 40px; height: 40px; background: #fff3cd; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-play-circle" style="color: #856404; font-size: 1.2rem;"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fileName}">
                            ${fileName}
                        </div>
                        <div style="font-size: 0.75rem; color: #999;">${fileSize}</div>
                    </div>
                </div>
            </div>
        `;
    } else if (contentType === 'pdf' && module.fileUrl) {
        // Show PDF file info
        const fileName = module.fileMetadata?.originalName || 'PDF document';
        const fileSize = module.fileMetadata?.fileSize
            ? (module.fileMetadata.fileSize / (1024 * 1024)).toFixed(2) + ' MB'
            : 'Unknown size';

        previewContainer.innerHTML = `
            <div style="background: #f8d7da; padding: 12px; border-radius: 8px; border-left: 3px solid #721c24;">
                <div style="font-size: 0.8rem; color: #721c24; margin-bottom: 8px; font-weight: 600;">
                    <i class="fas fa-file-pdf" style="color: #721c24;"></i> PDF Document:
                </div>
                <div style="display: flex; align-items: center; gap: 10px; background: white; padding: 10px; border-radius: 6px;">
                    <div style="width: 40px; height: 40px; background: #f8d7da; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-file-pdf" style="color: #721c24; font-size: 1.2rem;"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 0.85rem; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fileName}">
                            ${fileName}
                        </div>
                        <div style="font-size: 0.75rem; color: #999;">${fileSize}</div>
                    </div>
                </div>
            </div>
        `;
    } else {
        // No content yet
        previewContainer.innerHTML = `
            <div style="background: #e9ecef; padding: 15px; border-radius: 8px; text-align: center;">
                <i class="fas fa-inbox" style="font-size: 2rem; color: #adb5bd; margin-bottom: 8px;"></i>
                <div style="font-size: 0.85rem; color: #6c757d; font-style: italic;">
                    No content added yet. Click "Edit Content" to add content.
                </div>
            </div>
        `;
    }
}

// Close module edit modal
window.closeEditModuleModal = function () {
    document.getElementById('editModuleModal').style.display = 'none';
    document.getElementById('editModuleForm').reset();

    // Clear content preview
    const previewContainer = document.getElementById('editModuleContentPreview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
};

// Open full module editor in new page
window.openFullModuleEditor = function () {
    const courseId = document.getElementById('editModuleCourseId').value;
    const moduleId = document.getElementById('editModuleId').value;

    if (!courseId || !moduleId) {
        UI.error('Module information not available');
        console.error('Missing IDs - courseId:', courseId, 'moduleId:', moduleId);
        return;
    }

    // Validate IDs are not 'undefined' or 'null' strings
    if (courseId === 'undefined' || courseId === 'null' || moduleId === 'undefined' || moduleId === 'null') {
        UI.error('Invalid module information');
        console.error('Invalid IDs - courseId:', courseId, 'moduleId:', moduleId);
        return;
    }

    console.log('Opening editor with courseId:', courseId, 'moduleId:', moduleId);
    window.location.href = `module-editor.html?courseId=${courseId}&moduleId=${moduleId}`;
};

// Handle module edit form submission
if (document.getElementById('editModuleForm')) {
    document.getElementById('editModuleForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const moduleId = document.getElementById('editModuleId').value;
        const data = {
            title: document.getElementById('editModuleTitle').value,
            description: document.getElementById('editModuleDescription').value,
            minDuration: parseInt(document.getElementById('editModuleDuration').value) || 10,
            status: 'Pending'  // Always set to Pending after staff edits
        };

        try {
            UI.showLoader();

            const res = await fetch(`${Auth.apiBase}/modules/${moduleId}`, {
                method: 'PUT',
                headers: {
                    ...Auth.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to update module');
            }

            UI.success('Module updated and sent for approval!');
            closeEditModuleModal();

            // Reload the materials section to show updated data
            loadMyMaterials();

            // If in modules section, reload that too
            if (currentModuleCourse) {
                await loadCourseModules(currentModuleCourse);
            }

        } catch (err) {
            console.error('Update failed:', err);
            UI.error('Failed to update module: ' + err.message);
        } finally {
            UI.hideLoader();
        }
    });
}

// ============================================
// NEW UI ENHANCEMENTS
// ============================================

// Toggle Messages Panel
function toggleMessagesPanel() {
    const panel = document.getElementById('messagesPanel');
    if (panel) {
        panel.classList.toggle('open');
    }
}

// Load and Display Notifications
let allNotifications = [];
async function loadNotifications() {
    console.log('📬 Loading notifications...');
    const container = document.getElementById('notificationsList');

    if (!container) {
        console.error('❌ notificationsList container not found!');
        return;
    }

    // Show loading state
    container.innerHTML = '<p style="color: var(--color-text-secondary); text-align: center; padding: 20px;">Loading notifications...</p>';

    try {
        const res = await fetch(`${Auth.apiBase}/staff/notifications`, {
            headers: Auth.getHeaders()
        });

        if (res.ok) {
            const raw = await res.json();
            allNotifications = raw.map(n => ({
                id: n._id,
                type: n.type,
                title: n.title,
                message: n.message,
                timestamp: n.createdAt,
                seen: n.read
            }));
        } else {
            console.warn('⚠️ Failed to fetch notifications:', res.status);
            allNotifications = [];
        }
    } catch (err) {
        console.error('❌ Error loading notifications:', err);
        allNotifications = [];
    } finally {
        displayNotifications(allNotifications);
        updateNotificationBadge();
    }
}

// Display Notifications in List
function displayNotifications(notifications) {
    console.log('🎨 displayNotifications called with', notifications.length, 'notifications');
    const container = document.getElementById('notificationsList');

    if (!container) {
        console.error('❌ notificationsList container not found in displayNotifications!');
        return;
    }

    if (notifications.length === 0) {
        console.log('📭 No notifications to display');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                <i class="fas fa-bell-slash" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }

    // Sort by date (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log('✅ Rendering', notifications.length, 'notifications');

    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.seen ? 'seen' : 'unseen'}" data-id="${notif.id}">
            <div class="notification-content">
                <div class="notification-title">
                    ${notif.seen ? '' : '<span class="unread-dot"></span>'}
                    ${notif.title}
                </div>
                <div class="notification-message">${notif.message}</div>
                <div class="notification-time">${formatTimestamp(notif.timestamp)}</div>
            </div>
            <div class="notification-actions">
                ${notif.seen ?
            `<button onclick="markAsUnread('${notif.id}')" class="notification-action-btn" title="Mark as unread">
                        <i class="fas fa-envelope"></i>
                    </button>` :
            `<button onclick="markAsSeen('${notif.id}')" class="notification-action-btn" title="Mark as read">
                        <i class="fas fa-envelope-open"></i>
                    </button>`
        }
                <button onclick="deleteNotification('${notif.id}')" class="notification-action-btn" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    console.log('✅ Notifications rendered successfully');
}

// Filter Notifications
function filterNotifications(filter) {
    // Get filter value from dropdown if not provided
    if (!filter) {
        const dropdown = document.getElementById('notificationFilter');
        filter = dropdown ? dropdown.value : 'all';
    }

    let filtered = [...allNotifications];

    if (filter === 'unseen') {
        filtered = filtered.filter(n => !n.seen);
    } else if (filter === 'seen') {
        filtered = filtered.filter(n => n.seen);
    }

    displayNotifications(filtered);
}

// Mark Notification as Seen
async function markAsSeen(notificationId) {
    const notification = allNotifications.find(n => n.id === notificationId);
    if (notification) {
        notification.seen = true;
        displayNotifications(allNotifications);
        updateNotificationBadge();
        await fetch(`${Auth.apiBase}/staff/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { ...Auth.getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: true })
        }).catch(err => console.error('markAsSeen API error:', err));
    }
}

// Mark Notification as Unread
async function markAsUnread(notificationId) {
    const notification = allNotifications.find(n => n.id === notificationId);
    if (notification) {
        notification.seen = false;
        displayNotifications(allNotifications);
        updateNotificationBadge();
        await fetch(`${Auth.apiBase}/staff/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { ...Auth.getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: false })
        }).catch(err => console.error('markAsUnread API error:', err));
    }
}

// Delete Notification
async function deleteNotification(notificationId) {
    if (confirm('Delete this notification?')) {
        allNotifications = allNotifications.filter(n => n.id !== notificationId);
        displayNotifications(allNotifications);
        updateNotificationBadge();
        await fetch(`${Auth.apiBase}/staff/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: Auth.getHeaders()
        }).catch(err => console.error('deleteNotification API error:', err));
    }
}

// Update Badge Count
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    const unseenCount = allNotifications.filter(n => !n.seen).length;

    if (unseenCount > 0) {
        badge.textContent = unseenCount > 99 ? '99+' : unseenCount;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Format Timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Search/Filter Functions for Courses
function searchCourses() {
    const searchTerm = document.getElementById('courseSearchInput')?.value.toLowerCase();
    const filterStatus = document.getElementById('courseStatusFilter')?.value;
    const courseCards = document.querySelectorAll('#courseList .course-list-item');

    courseCards.forEach(card => {
        const title = card.querySelector('strong')?.textContent.toLowerCase() || '';
        const statusSpan = card.querySelector('span[style*="background"]');
        const status = statusSpan?.textContent.toLowerCase() || '';

        const matchesSearch = !searchTerm || title.includes(searchTerm);
        const matchesFilter = !filterStatus || filterStatus === '' || status.includes(filterStatus.toLowerCase());

        card.style.display = matchesSearch && matchesFilter ? '' : 'none';
    });
}

// Search/Filter Functions for Materials (Modules)
function searchMaterials() {
    const searchTerm = document.getElementById('materialSearchInput')?.value.toLowerCase();
    const filterType = document.getElementById('materialTypeFilter')?.value;
    const filterCourse = document.getElementById('materialCourseFilter')?.value;

    const courseGroups = document.querySelectorAll('#myMaterialsList .course-group-container');
    const moduleCards = document.querySelectorAll('#myMaterialsList .module-card');

    // Track which courses have visible modules
    const courseVisibility = new Map();

    moduleCards.forEach(card => {
        const moduleTitle = card.querySelector('h5')?.textContent.toLowerCase() || '';
        const moduleDesc = card.querySelector('p')?.textContent.toLowerCase() || '';
        const courseTitle = card.dataset.courseTitle?.toLowerCase() || '';
        const contentType = card.dataset.contentType || '';
        const courseId = card.closest('.course-group-container')?.dataset.courseId;

        const matchesSearch = !searchTerm ||
            moduleTitle.includes(searchTerm) ||
            moduleDesc.includes(searchTerm) ||
            courseTitle.includes(searchTerm);

        const matchesType = !filterType || filterType === '' || contentType === filterType;
        const matchesCourse = !filterCourse || filterCourse === '' ||
            card.closest('.course-group-container')?.dataset.courseId === filterCourse;

        const isVisible = matchesSearch && matchesType && matchesCourse;
        card.style.display = isVisible ? '' : 'none';

        // Track course visibility
        if (courseId) {
            if (!courseVisibility.has(courseId)) {
                courseVisibility.set(courseId, false);
            }
            if (isVisible) {
                courseVisibility.set(courseId, true);
            }
        }
    });

    // Hide/show course groups based on whether they have visible modules
    courseGroups.forEach(group => {
        const courseId = group.dataset.courseId;
        const hasVisibleModules = courseVisibility.get(courseId) || false;
        group.style.display = hasVisibleModules ? '' : 'none';
    });
}

// Search Students
function searchStudents() {
    const searchTerm = document.getElementById('studentSearchInput')?.value.toLowerCase();
    const filterCourse = document.getElementById('studentCourseFilter')?.value;
    const filterStudent = document.getElementById('studentNameFilter')?.value;
    const studentRows = document.querySelectorAll('#studentInsightList tr');

    studentRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const courseId = row.getAttribute('data-course-id');
        const studentId = row.getAttribute('data-student-id');

        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesCourse = !filterCourse || filterCourse === '' || courseId === filterCourse;
        const matchesStudent = !filterStudent || filterStudent === '' || studentId === filterStudent;

        row.style.display = matchesSearch && matchesCourse && matchesStudent ? '' : 'none';
    });
}

// Make toggleMessagesPanel global for onclick attribute
window.toggleMessagesPanel = toggleMessagesPanel;
window.markAsSeen = markAsSeen;
window.markAsUnread = markAsUnread;
window.deleteNotification = deleteNotification;

// Load Profile
async function loadProfile() {
    try {
        const res = await fetch(`${Auth.apiBase}/staff/profile`, { headers: Auth.getHeaders() });
        const user = await res.json();

        // Populate form fields
        document.getElementById('profileName').value = user.name || '';
        document.getElementById('profileStaffID').value = user.studentID || 'N/A';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profileFatherName').value = user.fatherName || '';
        document.getElementById('profileMotherName').value = user.motherName || '';
        document.getElementById('profileDOB').value = user.dob ? new Date(user.dob).toISOString().split('T')[0] : '';

        // Calculate and display age
        if (user.dob) {
            const age = calculateAge(new Date(user.dob));
            document.getElementById('profileAge').textContent = `Age: ${age} years`;
        }

        // Address fields
        document.getElementById('profileDoorNumber').value = user.address?.doorNumber || '';
        document.getElementById('profileStreet').value = user.address?.streetName || '';
        document.getElementById('profileTown').value = user.address?.town || '';
        document.getElementById('profileDistrict').value = user.address?.district || '';
        document.getElementById('profilePincode').value = user.address?.pincode || '';

        // Contact fields
        document.getElementById('profilePhone').value = user.phone || '';
        document.getElementById('profileAdditionalPhone').value = user.additionalPhone || '';

        // Bank details
        document.getElementById('profileAccountHolder').value = user.bankDetails?.accountHolderName || '';
        document.getElementById('profileAccountNumber').value = user.bankDetails?.accountNumber || '';
        document.getElementById('profileBankName').value = user.bankDetails?.bankName || '';
        document.getElementById('profileIFSC').value = user.bankDetails?.ifscCode || '';
        document.getElementById('profileBranch').value = user.bankDetails?.branchName || '';

        // Last login
        if (user.lastLogin) {
            const loginDate = new Date(user.lastLogin);
            document.getElementById('lastLoginDisplay').textContent = loginDate.toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
        } else {
            document.getElementById('lastLoginDisplay').textContent = 'No login history available';
        }
    } catch (err) {
        UI.handleError(err, 'Profile Load', 'Failed to load your profile. Please refresh the page.');
    }
}

// Calculate Age from DOB
function calculateAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Update age when DOB changes
document.getElementById('profileDOB')?.addEventListener('change', function () {
    if (this.value) {
        const age = calculateAge(new Date(this.value));
        document.getElementById('profileAge').textContent = `Age: ${age} years`;
    } else {
        document.getElementById('profileAge').textContent = '';
    }
});

// Personal Details Form Submission
document.getElementById('personalDetailsForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const personalData = {
        name: document.getElementById('profileName').value,
        fatherName: document.getElementById('profileFatherName').value,
        motherName: document.getElementById('profileMotherName').value,
        dob: document.getElementById('profileDOB').value
    };

    try {
        const res = await fetch(`${Auth.apiBase}/staff/profile`, {
            method: 'PUT',
            headers: { ...Auth.getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(personalData)
        });

        const data = await res.json();

        if (res.ok) {
            UI.success('Personal details updated successfully!');
            if (personalData.name) {
                const el = document.getElementById('mentorName');
                if (el) el.textContent = personalData.name;
            }
        } else {
            UI.error(data.message || 'Failed to update personal details');
        }
    } catch (err) {
        UI.handleError(err, 'Personal Details Update');
    }
});

// Address Details Form Submission
document.getElementById('addressDetailsForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const addressData = {
        doorNumber: document.getElementById('profileDoorNumber').value,
        streetName: document.getElementById('profileStreet').value,
        town: document.getElementById('profileTown').value,
        district: document.getElementById('profileDistrict').value,
        pincode: document.getElementById('profilePincode').value
    };

    try {
        const res = await fetch(`${Auth.apiBase}/staff/profile`, {
            method: 'PUT',
            headers: { ...Auth.getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(addressData)
        });

        const data = await res.json();

        if (res.ok) {
            UI.success('Address details updated successfully!');
        } else {
            UI.error(data.message || 'Failed to update address details');
        }
    } catch (err) {
        UI.handleError(err, 'Address Details Update');
    }
});

// Contact Details Form Submission
document.getElementById('contactDetailsForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const contactData = {
        phone: document.getElementById('profilePhone').value,
        additionalPhone: document.getElementById('profileAdditionalPhone').value
    };

    // Validate phone number
    if (contactData.phone && !/^\d{10}$/.test(contactData.phone)) {
        UI.error('Please enter a valid 10-digit phone number.');
        return;
    }

    if (contactData.additionalPhone && !/^\d{10}$/.test(contactData.additionalPhone)) {
        UI.error('Please enter a valid 10-digit additional phone number.');
        return;
    }

    try {
        const res = await fetch(`${Auth.apiBase}/staff/profile`, {
            method: 'PUT',
            headers: { ...Auth.getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData)
        });

        const data = await res.json();

        if (res.ok) {
            UI.success('Contact details updated successfully!');
        } else {
            UI.error(data.message || 'Failed to update contact details');
        }
    } catch (err) {
        UI.handleError(err, 'Contact Details Update');
    }
});

// Bank Details Form Submission
document.getElementById('bankDetailsForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const bankData = {
        accountHolderName: document.getElementById('profileAccountHolder').value,
        accountNumber: document.getElementById('profileAccountNumber').value,
        bankName: document.getElementById('profileBankName').value,
        ifscCode: document.getElementById('profileIFSC').value?.toUpperCase(),
        branchName: document.getElementById('profileBranch').value
    };

    try {
        const res = await fetch(`${Auth.apiBase}/staff/profile`, {
            method: 'PUT',
            headers: { ...Auth.getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(bankData)
        });

        const data = await res.json();

        if (res.ok) {
            UI.success('Bank details updated successfully!');
        } else {
            UI.error(data.message || 'Failed to update bank details');
        }
    } catch (err) {
        UI.handleError(err, 'Bank Details Update');
    }
});

// Change Password Form Submission
document.getElementById('changePasswordForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (newPassword.length < 8) {
        UI.error('New password must be at least 8 characters long.');
        return;
    }

    if (newPassword !== confirmPassword) {
        UI.error('New passwords do not match. Please re-enter.');
        return;
    }

    try {
        const res = await fetch(`${Auth.apiBase}/staff/change-password`, {
            method: 'POST',
            headers: { ...Auth.getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await res.json();

        if (res.ok) {
            UI.success('Password changed successfully!');
            document.getElementById('changePasswordForm').reset();
        } else {
            UI.error(data.message || 'Failed to change password');
        }
    } catch (err) {
        UI.handleError(err, 'Change Password');
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Don't load notifications on page load, only when tab is clicked
    // loadNotifications() will be called by switchSection('notifications')

    // Setup search/filter event listeners
    document.getElementById('courseSearchInput')?.addEventListener('input', searchCourses);
    document.getElementById('courseStatusFilter')?.addEventListener('change', searchCourses);
    document.getElementById('materialSearchInput')?.addEventListener('input', searchMaterials);
    document.getElementById('materialTypeFilter')?.addEventListener('change', searchMaterials);
    document.getElementById('materialCourseFilter')?.addEventListener('change', searchMaterials);
    document.getElementById('studentSearchInput')?.addEventListener('input', searchStudents);
    document.getElementById('studentCourseFilter')?.addEventListener('change', searchStudents);
    document.getElementById('studentNameFilter')?.addEventListener('change', searchStudents);

    // Setup create ticket form
    document.getElementById('createTicketForm')?.addEventListener('submit', handleCreateTicket);
});

// ==================== TICKET MANAGEMENT ====================

async function loadMyTickets() {
    const container = document.getElementById('myTicketsContainer');
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Loading tickets...</p>';

    try {
        const res = await fetch(`${Auth.apiBase}/tickets/my`, { headers: Auth.getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch tickets');

        const tickets = await res.json();

        if (tickets.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 60px;"><i class="fas fa-inbox" style="font-size: 4rem; opacity: 0.2; margin-bottom: 15px; display: block;"></i><p>No tickets yet. Create your first support ticket!</p></div>';
            return;
        }

        const statusColors = {
            'Open': '#ffc107',
            'In Progress': '#17a2b8',
            'Resolved': '#28a745',
            'Closed': '#6c757d'
        };

        container.innerHTML = `
            <div style="display: grid; gap: 15px;">
                ${tickets.map(ticket => `
                    <div style="background: white; border: 1px solid #e0e0e0; border-left: 4px solid ${statusColors[ticket.status]}; padding: 20px; border-radius: 8px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05);" onclick="viewStaffTicket('${ticket._id}')" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 2px 5px rgba(0,0,0,0.05)'">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                            <div>
                                <div style="font-weight: 700; color: #667eea; font-family: monospace; margin-bottom: 5px;">${ticket.ticketID}</div>
                                <div style="font-weight: 600; font-size: 1.1rem; color: #333; margin-bottom: 8px;">${ticket.subject}</div>
                                <div style="color: #666; line-height: 1.5;">${ticket.description ? ticket.description.substring(0, 120) : 'No description'}${ticket.description && ticket.description.length > 120 ? '...' : ''}</div>
                            </div>
                            <div style="text-align: right;">
                                <span style="display: inline-block; padding: 5px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; background: ${statusColors[ticket.status]}; color: white; margin-bottom: 5px;">
                                    ${ticket.status}
                                </span>
                                <div style="font-size: 0.85rem; color: #999;"><i class="fas fa-clock"></i> ${new Date(ticket.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 15px; font-size: 0.85rem; color: #666; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0;">
                            <div><i class="fas fa-exclamation-circle"></i> Priority: <strong>${ticket.priority}</strong></div>
                            <div><i class="fas fa-comments"></i> Replies: <strong>${ticket.replies ? ticket.replies.length : 0}</strong></div>
                            ${!ticket.isReadByUser ? '<div style="color: #667eea; font-weight: 600;"><i class="fas fa-bell"></i> New Reply</div>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        UI.handleError(error, 'My Tickets', 'Failed to load your tickets. Please try again.');
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;"><i class="fas fa-exclamation-circle" style="font-size: 2rem; opacity: 0.4; margin-bottom: 10px;"></i><p>Failed to load tickets. Please refresh the page.</p></div>';
    }
}

function openCreateTicketModal() {
    document.getElementById('createTicketModal').style.display = 'flex';
    document.getElementById('ticketSubject').value = '';
    document.getElementById('ticketDescription').value = '';
}

function closeCreateTicketModal() {
    document.getElementById('createTicketModal').style.display = 'none';
}

window.openCreateTicketModal = openCreateTicketModal;
window.closeCreateTicketModal = closeCreateTicketModal;

async function handleCreateTicket(e) {
    e.preventDefault();

    const subject = document.getElementById('ticketSubject').value;
    const description = document.getElementById('ticketDescription').value;

    if (!subject || !description) {
        UI.error('Please fill in all required fields');
        return;
    }

    try {
        UI.showLoader();
        const res = await fetch(`${Auth.apiBase}/tickets`, {
            method: 'POST',
            headers: Auth.getHeaders(),
            body: JSON.stringify({ subject, description })
        });

        if (!res.ok) throw new Error('Failed to create ticket');

        const data = await res.json();
        UI.success(`Ticket created successfully! Your ticket ID is: ${data.ticket.ticketID}`);
        closeCreateTicketModal();
        loadMyTickets();
    } catch (error) {
        console.error('Create ticket error:', error);
        UI.error('Failed to create ticket. Please try again.');
    } finally {
        UI.hideLoader();
    }
}

async function viewStaffTicket(ticketId) {
    try {
        UI.showLoader();
        const res = await fetch(`${Auth.apiBase}/tickets/${ticketId}`, { headers: Auth.getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch ticket');

        const ticket = await res.json();

        const statusColors = {
            'Open': '#ffc107',
            'In Progress': '#17a2b8',
            'Resolved': '#28a745',
            'Closed': '#6c757d'
        };

        document.getElementById('viewTicketContent').innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; margin-bottom: 20px; color: white;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <label style="font-size: 0.8rem; opacity: 0.9; display: block; margin-bottom: 5px;">Ticket ID</label>
                        <div style="font-weight: 700; font-family: monospace; font-size: 1.1rem;">${ticket.ticketID}</div>
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; opacity: 0.9; display: block; margin-bottom: 5px;">Status</label>
                        <div style="font-weight: 600;">${ticket.status}</div>
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; opacity: 0.9; display: block; margin-bottom: 5px;">Priority</label>
                        <div style="font-weight: 600;">${ticket.priority}</div>
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; opacity: 0.9; display: block; margin-bottom: 5px;">Created</label>
                        <div style="font-weight: 600;">${new Date(ticket.createdAt).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                <h4 style="margin: 0 0 10px 0; color: #333;"><i class="fas fa-tag"></i> Subject</h4>
                <div style="font-weight: 600; font-size: 1.1rem; color: #555;">${ticket.subject}</div>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e9ecef;">
                <h4 style="margin: 0 0 12px 0; color: #333;"><i class="fas fa-align-left"></i> Description</h4>
                <p style="margin: 0; line-height: 1.7; color: #555; white-space: pre-wrap;">${ticket.description}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #333;"><i class="fas fa-comments"></i> Conversation (${ticket.replies ? ticket.replies.length : 0})</h4>
                <div style="max-height: 400px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 12px; border: 1px solid #e9ecef;">
                    ${!ticket.replies || ticket.replies.length === 0 ? '<div style="text-align: center; color: #999; padding: 40px;"><i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3; margin-bottom: 10px; display: block;"></i><p>No replies yet. Waiting for admin response...</p></div>' : ''}
                    ${ticket.replies ? ticket.replies.map(reply => {
            const replier = reply.repliedBy || { name: 'Unknown', role: 'N/A' };
            return `
                        <div style="background: ${reply.isAdminReply ? 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' : 'white'}; padding: 18px; border-radius: 10px; margin-bottom: 12px; border-left: 4px solid ${reply.isAdminReply ? '#667eea' : '#cbd5e0'}; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <div style="font-weight: 600; color: ${reply.isAdminReply ? '#667eea' : '#333'}; display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${reply.isAdminReply ? '#667eea' : '#cbd5e0'}; display: flex; align-items: center; justify-content: center; color: white;">
                                        <i class="fas fa-${reply.isAdminReply ? 'user-shield' : 'user'}" style="font-size: 0.9rem;"></i>
                                    </div>
                                    <div>
                                        <div>${replier.name}</div>
                                        <small style="opacity: 0.7; font-weight: 400;">${reply.isAdminReply ? 'Administrator' : replier.role}</small>
                                    </div>
                                </div>
                                <small style="color: #666; font-size: 0.85rem;"><i class="fas fa-clock"></i> ${new Date(reply.repliedAt).toLocaleString()}</small>
                            </div>
                            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap; color: #444;">${reply.message}</p>
                        </div>
                    `}).join('') : ''}
                </div>
            </div>

            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; border: 2px dashed #cbd5e0;">
                <h4 style="margin: 0 0 15px 0; color: #333;"><i class="fas fa-reply"></i> Add Your Reply</h4>
                <textarea id="staffReplyMessage" class="form-control" rows="4" placeholder="Type your reply here..." style="margin-bottom: 15px; border-radius: 8px; border: 2px solid #cbd5e0; padding: 12px; resize: vertical;"></textarea>
                <button onclick="sendStaffReply('${ticket._id}')" class="btn-primary" style="width: 100%; padding: 12px; border-radius: 8px; font-weight: 600; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; cursor: pointer;">
                    <i class="fas fa-paper-plane"></i> Send Reply
                </button>
            </div>
        `;

        document.getElementById('viewTicketModal').style.display = 'flex';
    } catch (error) {
        console.error('View ticket error:', error);
        UI.error('Failed to load ticket details');
    } finally {
        UI.hideLoader();
    }
}

function closeViewTicketModal() {
    document.getElementById('viewTicketModal').style.display = 'none';
}

window.viewStaffTicket = viewStaffTicket;
window.closeViewTicketModal = closeViewTicketModal;

async function sendStaffReply(ticketId) {
    const message = document.getElementById('staffReplyMessage').value.trim();

    if (!message) {
        UI.error('Please enter a reply message');
        return;
    }

    try {
        UI.showLoader();
        const res = await fetch(`${Auth.apiBase}/tickets/${ticketId}/reply`, {
            method: 'POST',
            headers: Auth.getHeaders(),
            body: JSON.stringify({ message })
        });

        if (!res.ok) throw new Error('Failed to send reply');

        UI.success('Reply sent successfully!');
        closeViewTicketModal();
        loadMyTickets();
    } catch (error) {
        console.error('Send reply error:', error);
        UI.error('Failed to send reply. Please try again.');
    } finally {
        UI.hideLoader();
    }
}

window.sendStaffReply = sendStaffReply;

/* --- STAFF STEPPER WIZARD CONTINUED --- */
// Note: staffResetWizard is now defined earlier (before DOMContentLoaded)
// to avoid reference errors

window.staffStepNext = function () {
    if (!validateStaffStep(currentStaffStep)) return;
    currentStaffStep++;
    updateStaffStepUI();
}

window.jumpStaffStep = function (n) {
    // Validate if jumping ahead deeply? For now allow "Edit Mode" freedom
    // But basic validation of step 1 is useful if creating new
    if (n > currentStaffStep + 1 && currentStaffStep === 1) {
        if (!validateStaffStep(1)) return;
    }

    currentStaffStep = n;
    updateStaffStepUI();
}

window.staffStepBack = function () {
    if (currentStaffStep > 1) currentStaffStep--;
    updateStaffStepUI();
}

function updateStaffStepUI() {
    // 1. Show/Hide Steps
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById(`step${i}`);
        if (el) el.style.display = (i === currentStaffStep) ? 'block' : 'none';

        // 2. Update Header Indicators
        const stepLabels = ['Basic Info', 'Key Details', 'Media', 'Finalize'];

        document.querySelectorAll('.step-indicator').forEach(el => {
            const step = parseInt(el.dataset.step);
            const labelText = stepLabels[step - 1] || step;

            if (step < currentStaffStep) {
                el.className = 'step-indicator completed';
                el.style.background = 'var(--color-success)';
                el.style.color = 'white';
                el.innerHTML = `<i class="fas fa-check"></i> ${labelText}`;
            } else if (step === currentStaffStep) {
                el.className = 'step-indicator active';
                el.style.background = 'var(--color-saffron)';
                el.style.color = 'white';
                el.innerHTML = labelText;
            } else {
                el.className = 'step-indicator';
                el.style.background = '#eee';
                el.style.color = '#999';
                el.innerHTML = labelText;
            }
        });
    }

    // 2. Progress Bar
    const progress = ((currentStaffStep - 1) / 3) * 100;
    const bar = document.getElementById('staffStepProgress');
    if (bar) bar.style.width = `${progress}%`;

    // 3. Label
    const labels = ['Essential Details', 'Key Information', 'Media & Preview', 'Finalize & Launch'];
    const labelEl = document.getElementById('staffStepLabel');
    if (labelEl) labelEl.innerText = labels[currentStaffStep - 1];

    const stepDisp = document.getElementById('staffCurrentStepDisplay');
    if (stepDisp) stepDisp.innerText = currentStaffStep;

    // 4. Buttons
    const prev = document.getElementById('staffPrevBtn');
    const next = document.getElementById('staffNextBtn');
    const draft = document.getElementById('staffDraftBtn');

    if (prev) prev.style.visibility = (currentStaffStep === 1) ? 'hidden' : 'visible';

    if (currentStaffStep === 4) {
        if (next) next.style.display = 'none';
        if (draft) draft.style.display = 'block';
    } else {
        if (next) {
            next.style.display = 'block';
            next.innerText = 'Next';
        }
        if (draft) draft.style.display = 'none';
    }
}

function validateStaffStep(step) {
    let isValid = true;
    let msg = '';

    if (step === 1) {
        if (!document.getElementById('courseTitle').value.trim()) { isValid = false; msg = 'Title is required.'; }
    } else if (step === 2) {
        if (!document.getElementById('coursePrice').value) { isValid = false; msg = 'Price is required.'; }
        if (!document.getElementById('courseDesc').value.trim()) { isValid = false; msg = 'Description is required.'; }
        if (!document.getElementById('courseDuration').value.trim()) { isValid = false; msg = 'Duration is required.'; }
    }

    if (!isValid) UI.error(msg);
    return isValid;
}

window.submitCourse = async function () {
    const form = document.getElementById('courseForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        UI.showLoader();
        const res = await fetch(`${Auth.apiBase}/staff/courses`, {
            method: 'POST',
            headers: Auth.getHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) {
            UI.success('Course draft created!');
            document.getElementById('courseModal').style.display = 'none';
            loadCourses();
        } else {
            const err = await res.json();
            UI.error(err.message || 'Creation failed');
        }
    } catch (err) {
        UI.error('Could not initiate the course draft.');
    } finally {
        UI.hideLoader();
    }
};

// ===================================
// MODULE MANAGER FUNCTIONALITY
// ===================================

let currentModuleCourse = null;
let currentModules = [];
let moduleSortable = null;

// Initialize modules section
async function loadModulesSection() {
    try {
        // Load courses for dropdown
        const res = await fetch(`${Auth.apiBase}/staff/courses`, {
            headers: Auth.getHeaders()
        });

        if (!res.ok) throw new Error('Failed to load courses');

        const courses = await res.json();
        const select = document.getElementById('modulesCourseSelect');

        select.innerHTML = '<option value="">-- Select a course --</option>';

        if (!courses || courses.length === 0) {
            select.innerHTML += '<option value="" disabled>No courses available</option>';
            return;
        }

        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course._id;
            option.textContent = course.title;
            select.appendChild(option);
        });

        // Setup event listeners if not already set
        if (!select.dataset.listenerAdded) {
            select.addEventListener('change', handleModuleCourseChange);
            select.dataset.listenerAdded = 'true';
        }

        // Setup add module button
        const addBtn = document.getElementById('addModuleBtn');
        if (addBtn && !addBtn.dataset.listenerAdded) {
            addBtn.addEventListener('click', handleAddModule);
            addBtn.dataset.listenerAdded = 'true';
        }

        // Auto-select if only one course
        if (courses.length === 1) {
            select.value = courses[0]._id;
            await handleModuleCourseChange();
        }

    } catch (err) {
        console.error('Failed to load courses:', err);
        UI.error('Failed to load courses for modules');
    }
}

async function handleModuleCourseChange() {
    const courseId = document.getElementById('modulesCourseSelect').value;

    if (!courseId) {
        currentModuleCourse = null;
        currentModules = [];
        renderModulesList();
        return;
    }

    currentModuleCourse = courseId;
    await loadCourseModules(courseId);
}

async function loadCourseModules(courseId) {
    try {
        UI.showLoader();

        const res = await fetch(`${Auth.apiBase}/courses/${courseId}/modules?includeUnpublished=true`, {
            headers: Auth.getHeaders()
        });

        if (!res.ok) throw new Error('Failed to load modules');

        const data = await res.json();
        currentModules = data.modules || [];

        renderModulesList();

    } catch (err) {
        console.error('Failed to load modules:', err);
        UI.error('Failed to load modules');
    } finally {
        UI.hideLoader();
    }
}

function renderModulesList() {
    const container = document.getElementById('modulesList');

    if (!currentModuleCourse) {
        container.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px; color: var(--color-text-secondary); opacity: 0.3;">
                    <i class="fas fa-layer-group"></i>
                </div>
                <p style="color: var(--color-text-secondary);">Select a course to view and manage modules</p>
            </div>
        `;
        return;
    }

    if (currentModules.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 3rem; margin-bottom: 15px; color: var(--color-text-secondary); opacity: 0.3;">
                    <i class="fas fa-book"></i>
                </div>
                <h4 style="color: var(--color-text-secondary); margin-bottom: 10px;">No Modules Yet</h4>
                <p style="color: var(--color-text-secondary);">Create your first module to start building course content!</p>
            </div>
        `;
        return;
    }

    // Helper function to get content type icon
    const getContentTypeIcon = (contentType) => {
        switch (contentType) {
            case 'video':
                return '<i class="fas fa-video" style="color: #856404;" title="Video"></i>';
            case 'pdf':
                return '<i class="fas fa-file-pdf" style="color: #721c24;" title="PDF"></i>';
            case 'rich-content':
            default:
                return '<i class="fas fa-align-left" style="color: #0056b3;" title="Rich Content"></i>';
        }
    };

    container.innerHTML = `
        <div style="display: grid; gap: 15px;">
            ${currentModules.map(module => `
                <div class="module-item" data-module-id="${module._id}">
                    <div class="module-header">
                        <i class="fas fa-grip-vertical drag-handle"></i>
                        <div class="module-info">
                            <div class="module-title">
                                ${getContentTypeIcon(module.contentType || 'rich-content')}
                                <span>${module.order + 1}. ${module.title}</span>
                            </div>
                            <div class="module-meta">
                                ${module.status === 'Published' ?
            '<span style="color: #28a745;">• Published</span>' :
            (module.status === 'Approved' ?
                '<span style="color: #17a2b8;">• Approved (Upcoming)</span>' :
                '<span style="color: #ffc107;">• ' + module.status + '</span>'
            )
        }
                            </div>
                        </div>
                        <div class="module-actions">
                            <button class="icon-btn" onclick="editModule('${module._id}')" title="Edit Content">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="icon-btn delete" onclick="deleteModule('${module._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    ${module.description ? `<p style="margin: 10px 0 0 40px; color: #6c757d; font-size: 0.9rem; overflow-wrap: break-word;">${module.description}</p>` : ''}
                </div>
            `).join('')}
        </div>
    `;

    // Initialize drag-drop
    initializeModuleSortable();
}

function initializeModuleSortable() {
    const container = document.getElementById('modulesList');
    const moduleContainer = container.querySelector('[style*="display: grid"]');

    if (!moduleContainer) return;

    if (moduleSortable) {
        moduleSortable.destroy();
    }

    moduleSortable = new Sortable(moduleContainer, {
        animation: 200,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: handleModuleReorder
    });
}

async function handleModuleReorder(evt) {
    const newOrder = Array.from(document.querySelectorAll('.module-item')).map((item, index) => {
        return {
            id: item.dataset.moduleId,
            order: index
        };
    });

    try {
        const res = await fetch(`${Auth.apiBase}/courses/${currentModuleCourse}/modules/reorder`, {
            method: 'PUT',
            headers: {
                ...Auth.getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ moduleOrders: newOrder })
        });

        if (!res.ok) throw new Error('Failed to reorder');

        // Update local order
        currentModules.forEach(module => {
            const found = newOrder.find(o => o.id === module._id);
            if (found) module.order = found.order;
        });

        UI.success('Modules reordered successfully');

    } catch (err) {
        console.error('Reorder failed:', err);
        UI.error('Failed to reorder modules');
        // Reload to restore original order
        await loadCourseModules(currentModuleCourse);
    }
}

function handleAddModule() {
    if (!currentModuleCourse) {
        UI.error('Please select a course first');
        return;
    }

    // Set course ID and open modal
    document.getElementById('addModuleCourseId').value = currentModuleCourse;
    document.getElementById('addModuleModal').style.display = 'flex';
}

// Close add module modal
window.closeAddModuleModal = function () {
    document.getElementById('addModuleModal').style.display = 'none';
    document.getElementById('addModuleForm').reset();
};

// Handle add module form submission
if (document.getElementById('addModuleForm')) {
    document.getElementById('addModuleForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const courseId = document.getElementById('addModuleCourseId').value;
        const contentType = document.querySelector('input[name="contentType"]:checked').value;

        const data = {
            title: document.getElementById('addModuleTitle').value,
            description: document.getElementById('addModuleDescription').value,
            minDuration: parseInt(document.getElementById('addModuleDuration').value) || 10,
            contentType: contentType,
            status: 'Pending',  // New modules start as Pending
            courseId: courseId
        };

        try {
            UI.showLoader();

            const res = await fetch(`${Auth.apiBase}/courses/${courseId}/modules`, {
                method: 'POST',
                headers: {
                    ...Auth.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to create module');
            }

            const result = await res.json();
            UI.success('Module created successfully! Redirecting to editor...');
            closeAddModuleModal();

            // Reload modules list
            await loadCourseModules(courseId);

            // Redirect to editor to add content
            setTimeout(() => {
                window.location.href = `module-editor.html?courseId=${courseId}&moduleId=${result._id || result.module?._id}`;
            }, 1000);

        } catch (err) {
            console.error('Creation failed:', err);
            UI.error('Failed to create module: ' + err.message);
        } finally {
            UI.hideLoader();
        }
    });
}

window.editModule = async function (moduleId) {
    if (!currentModuleCourse) return;

    // Use the same modal as materials section for consistency
    await viewModuleInManager(currentModuleCourse, moduleId);
};

window.deleteModule = async function (moduleId) {
    const module = currentModules.find(m => m._id === moduleId);
    if (!module) return;

    if (!confirm(`Are you sure you want to delete "${module.title}"?\n\nThis cannot be undone.`)) {
        return;
    }

    try {
        UI.showLoader();

        const res = await fetch(`${Auth.apiBase}/modules/${moduleId}`, {
            method: 'DELETE',
            headers: Auth.getHeaders()
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to delete');
        }

        UI.success('Module deleted successfully');
        await loadCourseModules(currentModuleCourse);

    } catch (err) {
        console.error('Delete failed:', err);
        UI.error('Failed to delete module: ' + err.message);
    } finally {
        UI.hideLoader();
    }
};