/* ============================================
   BANNER MANAGEMENT MODULE
   ============================================ */

let cropperInstance = null;
let selectedBannerFile = null;
let editingBannerId = null;

// === LOAD BANNERS LIST ===
async function loadBannersList() {
    const gridContainer = document.getElementById('bannersGrid');
    const emptyState = document.getElementById('bannersEmptyState');

    if (!gridContainer) return;

    try {
        const response = await fetch(`${Auth.apiBase}/banners/admin`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch banners');

        const data = await response.json();
        const banners = data.banners || data;

        if (!banners || !Array.isArray(banners) || banners.length === 0) {
            gridContainer.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Construct Base URL for images
        // Assumes Auth.apiBase is something like "https://awarenessacademy.in/api"
        const apiBaseUrl = Auth.apiBase.endsWith('/api')
            ? Auth.apiBase.slice(0, -4)
            : Auth.apiBase;

        gridContainer.innerHTML = banners.map((banner, index) => {
            // Ensure proper image path construction
            let imageUrl = banner.imageUrl;
            if (imageUrl && !imageUrl.startsWith('http')) {
                // Normalize slashes
                let relativePath = imageUrl.replace(/\\/g, '/');

                // Remove 'backend/' prefix if present because server.js serves '/uploads' mapped to 'backend/uploads'
                if (relativePath.startsWith('backend/')) {
                    relativePath = relativePath.substring(8);
                } else if (relativePath.startsWith('/backend/')) {
                    relativePath = relativePath.substring(9);
                }

                // Ensure no leading slash for clean concatenation
                if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);

                imageUrl = `${apiBaseUrl}/${relativePath}`;
            }

            // Fallback image (Data URI to avoid external dependencies)
            const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='300' viewBox='0 0 800 300'%3E%3Crect width='800' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='24' fill='%23999' text-anchor='middle' dy='.3em'%3EImage Not Found%3C/text%3E%3C/svg%3E";

            return `
            <div class="glass-card" style="background: white; border-radius: 15px; overflow: hidden; transition: transform 0.2s; border: 1px solid #eee; position: relative;" data-id="${banner._id}">
                <div style="position: relative; aspect-ratio: 16/6; background: #f0f0f0;">
                    <img src="${imageUrl}" alt="${banner.title || 'Banner'}" 
                        style="width: 100%; height: 100%; object-fit: cover;"
                        onerror="this.onerror=null; this.src='${fallbackImage}'">
                    
                    <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
                        #${index + 1}
                    </div>

                     <!-- Kebab Menu -->
                    <div style="position: absolute; top: 10px; right: 10px;">
                        <button onclick="toggleBannerMenu('${banner._id}', event)" 
                            style="background: white; border: none; width: 30px; height: 30px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-ellipsis-v" style="color: #555;"></i>
                        </button>
                        <div id="banner-menu-${banner._id}" class="banner-dropdown-menu" 
                            style="display: none; position: absolute; top: 35px; right: 0; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 120px; z-index: 100; overflow: hidden; border: 1px solid #eee;">
                            <button onclick="editBanner('${banner._id}')" style="width: 100%; text-align: left; padding: 10px 15px; background: none; border: none; cursor: pointer; font-size: 0.9rem; color: #333; display: flex; align-items: center; gap: 8px; transition: background 0.2s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='none'">
                                <i class="fas fa-edit" style="color: #667eea; font-size: 0.9rem;"></i> Edit
                            </button>
                            <button onclick="confirmDeleteBanner('${banner._id}')" style="width: 100%; text-align: left; padding: 10px 15px; background: none; border: none; cursor: pointer; font-size: 0.9rem; color: #e74c3c; display: flex; align-items: center; gap: 8px; border-top: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background='#fff5f5'" onmouseout="this.style.background='none'">
                                <i class="fas fa-trash" style="color: #e74c3c; font-size: 0.9rem;"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 15px;">
                    <h4 style="margin: 0 0 5px 0; color: #333; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${banner.title || 'Untitled Banner'}
                    </h4>
                    <p style="margin: 0; color: #999; font-size: 0.85rem;">
                        <i class="fas fa-calendar-alt"></i> ${new Date(banner.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>
            `;
        }).join('');

        // Initialize sorting
        if (typeof initBannerSorting === 'function') {
            initBannerSorting();
        }

        // Close menus when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.banner-dropdown-menu') && !e.target.closest('button[onclick^="toggleBannerMenu"]')) {
                document.querySelectorAll('.banner-dropdown-menu').forEach(menu => menu.style.display = 'none');
            }
        });

    } catch (error) {
        console.error('Error loading banners:', error);
        showToast('Failed to load banners', 'error');
    }
}

// Toggle Banner Menu
function toggleBannerMenu(id, event) {
    event.stopPropagation();
    // Close others
    document.querySelectorAll('.banner-dropdown-menu').forEach(menu => {
        if (menu.id !== `banner-menu-${id}`) menu.style.display = 'none';
    });

    const menu = document.getElementById(`banner-menu-${id}`);
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

// Placeholder for Edit
function editBannerPlaceholder(bannerId) {
    editBanner(bannerId);
}

// === OPEN UPLOAD MODAL ===
function openBannerUploadModal() {
    const modal = document.getElementById('bannerUploadModal');
    const fileInput = document.getElementById('bannerFileInput');
    const step1 = document.getElementById('bannerUploadStep1');
    const step2 = document.getElementById('bannerUploadStep2');
    const errorDiv = document.getElementById('bannerUploadErrors');
    const modalTitle = modal.querySelector('h3');
    const uploadZoneText = document.querySelector('#bannerUploadZone h3');

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

    // Reset modal title and text
    if (modalTitle) modalTitle.textContent = 'Upload New Banner';
    if (uploadZoneText) uploadZoneText.textContent = 'Drag & Drop Banner Image';

    // Clear title input
    document.getElementById('bannerTitleInput').value = '';

    // Hide "Save Title Only" button for new uploads
    const saveTitleBtn = document.getElementById('saveTitleOnlyBtn');
    if (saveTitleBtn) saveTitleBtn.style.display = 'none';

    modal.style.display = 'flex';
}

// === CLOSE UPLOAD MODAL ===
function closeBannerUploadModal() {
    const modal = document.getElementById('bannerUploadModal');
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }

    // Reset inputs
    document.getElementById('bannerTitleInput').value = '';
    const linkInput = document.getElementById('bannerLinkInput');
    if (linkInput) linkInput.value = '';
    const fileInput = document.getElementById('bannerFileInput');
    if (fileInput) fileInput.value = '';

    // Reset modal title
    const modalTitle = modal.querySelector('h3');
    const uploadZoneText = document.querySelector('#bannerUploadZone h3');
    if (modalTitle) modalTitle.textContent = 'Upload New Banner';
    if (uploadZoneText) uploadZoneText.textContent = 'Drag & Drop Banner Image';

    // Reset editing state
    editingBannerId = null;

    // Hide "Save Title Only" button
    const saveTitleBtn = document.getElementById('saveTitleOnlyBtn');
    if (saveTitleBtn) saveTitleBtn.style.display = 'none';

    // Reset steps
    document.getElementById('bannerUploadStep1').style.display = 'block';
    document.getElementById('bannerUploadStep2').style.display = 'none';
    document.getElementById('bannerUploadErrors').innerHTML = '';

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

    // File size validation (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
        errors.push('File size exceeds 50MB limit');
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
        viewMode: 1, // Changed from 2 to 1 to allow more freedom
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true, // Allowed moving the box if needed
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
    const mobilePreview = document.getElementById('bannerMobilePreview');

    const canvas = cropperInstance.getCroppedCanvas({
        width: 1920,
        height: 720
    });

    if (canvas) {
        const previewUrl = canvas.toDataURL('image/jpeg', 0.9);
        desktopPreview.innerHTML = `<img src="${previewUrl}" style="width: 100%; height: auto; border-radius: 8px;">`;
        mobilePreview.innerHTML = `<img src="${previewUrl}" style="width: 100%; height: auto;">`;
    }
}

// === SWITCH PREVIEW TAB ===
function switchBannerPreview(mode) {
    const desktopBtn = document.getElementById('btnPreviewDesktop');
    const mobileBtn = document.getElementById('btnPreviewMobile');
    const desktopContainer = document.getElementById('desktopPreviewContainer');
    const mobileContainer = document.getElementById('mobilePreviewContainer');

    if (mode === 'desktop') {
        desktopBtn.style.background = '#eaecf0';
        desktopBtn.style.color = '#333';
        mobileBtn.style.background = 'transparent';
        mobileBtn.style.color = '#666';

        desktopContainer.style.display = 'block';
        mobileContainer.style.display = 'none';
    } else {
        mobileBtn.style.background = '#eaecf0';
        mobileBtn.style.color = '#333';
        desktopBtn.style.background = 'transparent';
        desktopBtn.style.color = '#666';

        mobileContainer.style.display = 'block';
        desktopContainer.style.display = 'none';
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

        const title = document.getElementById('bannerTitleInput').value.trim();

        if (!title) {
            showToast('Please enter a banner title', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Crop & Upload';
            return;
        }

        const formData = new FormData();
        formData.append('image', blob, 'banner.jpg');
        formData.append('title', title);

        let url, method;
        if (editingBannerId) {
            // Update existing banner
            url = `${Auth.apiBase}/banners/${editingBannerId}`;
            method = 'PUT';
        } else {
            // Create new banner
            url = `${Auth.apiBase}/banners`;
            method = 'POST';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const successMsg = editingBannerId ? 'Banner updated successfully!' : 'Banner uploaded successfully!';
        showToast(successMsg, 'success');
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
        const response = await fetch(`${Auth.apiBase}/banners/${bannerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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

// === EDIT BANNER ===
async function editBanner(bannerId) {
    try {
        // Fetch banner details
        const response = await fetch(`${Auth.apiBase}/banners/admin`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch banners');

        const data = await response.json();
        const banners = data.banners || data;
        const banner = banners.find(b => b._id === bannerId);

        if (!banner) {
            showToast('Banner not found', 'error');
            return;
        }

        // Set editing mode
        editingBannerId = bannerId;

        // Open modal
        const modal = document.getElementById('bannerUploadModal');
        const fileInput = document.getElementById('bannerFileInput');
        const step1 = document.getElementById('bannerUploadStep1');
        const step2 = document.getElementById('bannerUploadStep2');
        const errorDiv = document.getElementById('bannerUploadErrors');
        const modalTitle = modal.querySelector('h3');
        const uploadZoneText = document.querySelector('#bannerUploadZone h3');

        // Reset modal
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
        selectedBannerFile = null;
        step1.style.display = 'block';
        step2.style.display = 'none';
        errorDiv.innerHTML = '';
        fileInput.value = '';
        document.getElementById('cropAndUploadBtn').style.display = 'none';

        // Update modal title and text
        if (modalTitle) modalTitle.textContent = 'Edit Banner';
        if (uploadZoneText) uploadZoneText.textContent = 'Update Banner Image (Optional)';

        // Pre-fill title
        document.getElementById('bannerTitleInput').value = banner.title || '';

        // Show "Save Title Changes" button for edit mode
        const saveTitleBtn = document.getElementById('saveTitleOnlyBtn');
        if (saveTitleBtn) saveTitleBtn.style.display = 'inline-flex';

        // Show modal
        modal.style.display = 'flex';

    } catch (error) {
        console.error('Edit error:', error);
        showToast('Failed to load banner details', 'error');
    }
}

// === INITIALIZE UPLOAD HANDLERS ===
let handlersInitialized = false;

function initBannerUploadHandlers() {
    // Prevent duplicate initialization
    if (handlersInitialized) return;
    handlersInitialized = true;

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

// === INITIALIZE DRAG & DROP SORTING ===
function initBannerSorting() {
    const grid = document.getElementById('bannersGrid');
    if (!grid) return;

    // Use SortableJS (assuming it's loaded in index.html/admin-dashboard.html)
    if (typeof Sortable !== 'undefined') {
        new Sortable(grid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function () {
                // Show save button and info
                document.getElementById('saveBannerOrderBtn').style.display = 'inline-flex';
                document.getElementById('bannerDragInfo').style.display = 'flex';
            }
        });
    }
}

// === SAVE BANNER ORDER ===
async function saveBannerOrder() {
    const grid = document.getElementById('bannersGrid');
    const cards = grid.querySelectorAll('.glass-card');
    const orderedIds = [];

    cards.forEach((card) => {
        const id = card.getAttribute('data-id');
        if (id) {
            orderedIds.push(id);
        }
    });

    if (orderedIds.length === 0) return;

    const btn = document.getElementById('saveBannerOrderBtn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        // Use the bulk reorder endpoint
        const response = await fetch(`${Auth.apiBase}/banners/reorder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ orderedIds })
        });

        if (!response.ok) throw new Error('Failed to update order');

        showToast('Banner order saved successfully!', 'success');
        document.getElementById('saveBannerOrderBtn').style.display = 'none';
        document.getElementById('bannerDragInfo').style.display = 'none';

        // Reload list to refresh order numbers on API
        loadBannersList();

    } catch (error) {
        console.error('Error saving order:', error);
        showToast('Failed to save order', 'error');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

// === SAVE BANNER TITLE ONLY (Edit Mode) ===
async function saveBannerTitleOnly() {
    if (!editingBannerId) {
        showToast('No banner selected for editing', 'error');
        return;
    }

    const title = document.getElementById('bannerTitleInput').value.trim();

    if (!title) {
        showToast('Please enter a banner title', 'error');
        return;
    }

    const btn = document.getElementById('saveTitleOnlyBtn');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const response = await fetch(`${Auth.apiBase}/banners/${editingBannerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ title })
        });

        if (!response.ok) throw new Error('Update failed');

        showToast('Banner title updated successfully!', 'success');
        closeBannerUploadModal();
        loadBannersList();

    } catch (error) {
        console.error('Update error:', error);
        showToast('Failed to update banner title', 'error');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

// === EXPORT FUNCTIONS ===
window.loadBannersList = loadBannersList;
window.openBannerUploadModal = openBannerUploadModal;
window.closeBannerUploadModal = closeBannerUploadModal;
window.cropAndUploadBanner = cropAndUploadBanner;
window.editBanner = editBanner;
window.confirmDeleteBanner = confirmDeleteBanner;
window.initBannerUploadHandlers = initBannerUploadHandlers;
window.saveBannerOrder = saveBannerOrder;
window.saveBannerTitleOnly = saveBannerTitleOnly;
window.toggleBannerMenu = toggleBannerMenu;
window.editBannerPlaceholder = editBannerPlaceholder;

// Note: Auto-initialization removed - called explicitly from admin.js to avoid duplicate listeners
