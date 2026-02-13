/* ============================================
   BANNER MANAGEMENT MODULE
   ============================================ */

let cropperInstance = null;
let selectedBannerFile = null;
let editingBannerId = null;

// === LOAD BANNERS LIST ===
async function loadBannersList() {
    const tableBody = document.getElementById('bannersTableBody');

    if (!tableBody) return;

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/banners`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch banners');

        const banners = await response.json();

        if (banners.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-images" style="font-size: 3rem; margin-bottom: 10px; opacity: 0.3;"></i>
                        <p>No banners uploaded yet</p>
                        <button class="btn-primary" onclick="openBannerUploadModal()" style="margin-top: 10px;">
                            <i class="fas fa-plus"></i> Upload First Banner
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = banners.map(banner => `
            <tr>
                <td>
                    <img src="${banner.imageUrl}" alt="Banner" style="width: 120px; height: 45px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;">
                </td>
                <td style="text-align: center; font-weight: 600;">${banner.order || 0}</td>
                <td>${banner.dimensions || '1920x720'}</td>
                <td>${new Date(banner.createdAt).toLocaleDateString()}</td>
                <td>
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button class="btn-icon" onclick="editBanner('${banner._id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon-danger" onclick="confirmDeleteBanner('${banner._id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading banners:', error);
        showToast('Failed to load banners', 'error');
    }
}

// === OPEN UPLOAD MODAL ===
function openBannerUploadModal() {
    const modal = document.getElementById('bannerUploadModal');
    const fileInput = document.getElementById('bannerFileInput');
    const step1 = document.getElementById('bannerUploadStep1');
    const step2 = document.getElementById('bannerUploadStep2');
    const errorDiv = document.getElementById('bannerUploadErrors');

    // Reset modal
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    selectedBannerFile = null;
    editingBannerId = null;
    step1.style.display = 'block';
    step2.style.display = 'none';
    errorDiv.innerHTML = '';
    fileInput.value = '';
    document.getElementById('cropAndUploadBtn').style.display = 'none';

    modal.style.display = 'block';
}

// === CLOSE UPLOAD MODAL ===
function closeBannerUploadModal() {
    const modal = document.getElementById('bannerUploadModal');
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    modal.style.display = 'none';
}

// === FILE VALIDATION ===
function validateBannerFile(file) {
    const errors = [];

    // File type validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        errors.push('Invalid file type. Please use JPG, PNG, or WEBP');
    }

    // File size validation (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        errors.push('File size exceeds 5MB limit');
    }

    return errors;
}

// === CHECK IMAGE DIMENSIONS ===
function checkImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = function (e) {
            img.onload = function () {
                if (this.width < 1600) {
                    reject('Image width must be at least 1600px');
                } else {
                    resolve({
                        width: this.width,
                        height: this.height,
                        dataUrl: e.target.result
                    });
                }
            };
            img.onerror = () => reject('Failed to load image');
            img.src = e.target.result;
        };

        reader.onerror = () => reject('Failed to read file');
        reader.readAsDataURL(file);
    });
}

// === HANDLE FILE SELECTION ===
async function handleBannerFileSelect(file) {
    const errorDiv = document.getElementById('bannerUploadErrors');
    errorDiv.innerHTML = '';

    // Validate file
    const errors = validateBannerFile(file);
    if (errors.length > 0) {
        errorDiv.innerHTML = errors.map(err =>
            `<div style="color: #EF4444; padding: 8px; background: #FEE2E2; border-radius: 8px; margin-bottom: 5px;">
                <i class="fas fa-exclamation-circle"></i> ${err}
            </div>`
        ).join('');
        return;
    }

    // Check dimensions
    try {
        const { width, height, dataUrl } = await checkImageDimensions(file);

        selectedBannerFile = file;

        // Show cropping step
        document.getElementById('bannerUploadStep1').style.display = 'none';
        document.getElementById('bannerUploadStep2').style.display = 'block';
        document.getElementById('cropAndUploadBtn').style.display = 'inline-flex';

        // Initialize cropper
        const imageElement = document.getElementById('imageToCrop');
        imageElement.src = dataUrl;

        setTimeout(() => {
            initializeBannerCropper(imageElement);
        }, 100);

    } catch (error) {
        errorDiv.innerHTML = `
            <div style="color: #EF4444; padding: 8px; background: #FEE2E2; border-radius: 8px;">
                <i class="fas fa-exclamation-circle"></i> ${error}
            </div>
        `;
    }
}

// === INITIALIZE CROPPER ===
function initializeBannerCropper(imageElement) {
    if (cropperInstance) {
        cropperInstance.destroy();
    }

    cropperInstance = new Cropper(imageElement, {
        aspectRatio: 16 / 6,
        viewMode: 2,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: false,
        cropBoxResizable: false,
        toggleDragModeOnDblclick: false,
        ready: function () {
            updateCropPreviews();
        },
        crop: function () {
            updateCropPreviews();
        }
    });
}

// === UPDATE CROP PREVIEWS ===
function updateCropPreviews() {
    if (!cropperInstance) return;

    const desktopPreview = document.getElementById('desktopPreview');
    const mobilePreview = document.getElementById('mobilePreview');

    const canvas = cropperInstance.getCroppedCanvas({
        width: 1920,
        height: 720
    });

    if (canvas) {
        const previewUrl = canvas.toDataURL('image/jpeg', 0.9);
        desktopPreview.innerHTML = `<img src="${previewUrl}" style="width: 100%; height: auto; border-radius: 8px;">`;
        mobilePreview.innerHTML = `<img src="${previewUrl}" style="width: 100%; height: auto; border-radius: 8px;">`;
    }
}

// === CROP AND UPLOAD ===
async function cropAndUploadBanner() {
    if (!cropperInstance) {
        showToast('No image to crop', 'error');
        return;
    }

    const btn = document.getElementById('cropAndUploadBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        const canvas = cropperInstance.getCroppedCanvas({
            width: 1920,
            height: 720
        });

        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });

        const formData = new FormData();
        formData.append('banner', blob, 'banner.jpg');

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/banners`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        showToast('Banner uploaded successfully!', 'success');
        closeBannerUploadModal();
        loadBannersList();

    } catch (error) {
        console.error('Upload error:', error);
        showToast('Failed to upload banner', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Crop & Upload';
    }
}

// === DELETE BANNER ===
function confirmDeleteBanner(bannerId) {
    if (confirm('Are you sure you want to delete this banner? This action cannot be undone.')) {
        deleteBanner(bannerId);
    }
}

async function deleteBanner(bannerId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/banners/${bannerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) throw new Error('Delete failed');

        showToast('Banner deleted successfully', 'success');
        loadBannersList();

    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete banner', 'error');
    }
}

// === EDIT BANNER (Future implementation) ===
function editBanner(bannerId) {
    showToast('Edit functionality coming soon', 'info');
    // TODO: Implement edit modal with order change and image replacement
}

// === INITIALIZE UPLOAD HANDLERS ===
function initBannerUploadHandlers() {
    const fileInput = document.getElementById('bannerFileInput');
    const uploadZone = document.getElementById('bannerUploadZone');

    if (!fileInput || !uploadZone) return;

    // Click to browse
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleBannerFileSelect(e.target.files[0]);
        }
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#667eea';
        uploadZone.style.background = 'rgba(102, 126, 234, 0.05)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = '#e5e7eb';
        uploadZone.style.background = '#f9fafb';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#e5e7eb';
        uploadZone.style.background = '#f9fafb';

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleBannerFileSelect(e.dataTransfer.files[0]);
        }
    });
}

// === EXPORT FUNCTIONS ===
window.loadBannersList = loadBannersList;
window.openBannerUploadModal = openBannerUploadModal;
window.closeBannerUploadModal = closeBannerUploadModal;
window.cropAndUploadBanner = cropAndUploadBanner;
window.editBanner = editBanner;
window.confirmDeleteBanner = confirmDeleteBanner;
window.initBannerUploadHandlers = initBannerUploadHandlers;
