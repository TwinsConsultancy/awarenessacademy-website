// ========== UPLOAD MATERIAL (ADMIN) ==========

function openUploadMaterialModal() {
    if (!currentMaterialsCourseId) {
        UI.error('No course selected');
        return;
    }
    
    // Set course name
    const courseName = document.getElementById('materialsCourseName').textContent;
    document.getElementById('uploadMaterialCourseName').textContent = courseName;
    
    // Reset form
    document.getElementById('uploadMaterialForm').reset();
    
    // Show modal
    document.getElementById('uploadMaterialModal').style.display = 'flex';
}

function closeUploadMaterialModal() {
    document.getElementById('uploadMaterialModal').style.display = 'none';
    document.getElementById('uploadMaterialForm').reset();
}

function updateFileAccept() {
    const type = document.getElementById('materialType').value;
    const fileInput = document.getElementById('materialFile');
    
    const acceptMap = {
        'PDF': '.pdf',
        'Video': '.mp4,.avi,.mov,.wmv,.flv,.mkv',
        'Audio': '.mp3,.wav,.m4a,.aac,.ogg'
    };
    
    fileInput.accept = acceptMap[type] || '.pdf,.mp4,.mp3,.wav,.avi,.mov,.m4a';
}

async function submitMaterialUpload() {
    const form = document.getElementById('uploadMaterialForm');
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const title = document.getElementById('materialTitle').value.trim();
    const type = document.getElementById('materialType').value;
    const file = document.getElementById('materialFile').files[0];
    const previewDuration = document.getElementById('previewDuration').value || 0;
    
    if (!title || !type || !file) {
        UI.error('Please fill all required fields');
        return;
    }
    
    // Category mapping
    const categoryMap = {
        'PDF': 'pdf',
        'Video': 'video',
        'Audio': 'audio'
    };
    
    try {
        UI.showLoader();
        
        const formData = new FormData();
        formData.append('courseID', currentMaterialsCourseId);
        formData.append('title', title);
        formData.append('type', type);
        formData.append('category', categoryMap[type]);
        formData.append('previewDuration', previewDuration);
        formData.append('file', file);
        
        const res = await fetch(`${Auth.apiBase}/courses/materials/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Upload failed');
        }
        
        const data = await res.json();
        UI.success('Material uploaded successfully!');
        
        closeUploadMaterialModal();
        
        // Reload materials
        const courseTitle = document.getElementById('materialsCourseName').textContent;
        openMaterialsModal(currentMaterialsCourseId, courseTitle);
        
    } catch (error) {
        console.error(error);
        UI.error(error.message || 'Failed to upload material');
    } finally {
        UI.hideLoader();
    }
}
