/**
 * InnerSpark - Global UI Utilities
 */

const UI = {
    loader: null,
    toastContainer: null,

    init() {
        // Create Loader
        if (!document.getElementById('global-loader')) {
            const loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = '<span class="sparkle-loader"></span>';
            document.body.appendChild(loader);
            this.loader = loader;
        }

        // Create Toast Container
        if (!document.querySelector('.toast-container')) {
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
            this.toastContainer = container;
        }
    },

    showLoader() {
        if (!this.loader) this.init();
        this.loader.style.display = 'flex';
    },

    hideLoader() {
        if (this.loader) this.loader.style.display = 'none';
    },

    showToast(message, type = 'info', duration = 4000) {
        if (!this.toastContainer) this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';

        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

        this.toastContainer.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },

    success(msg) { this.showToast(msg, 'success'); },
    error(msg) { this.showToast(msg, 'error'); },
    info(msg) { this.showToast(msg, 'info'); }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    applyGlobalSettings();
});

async function applyGlobalSettings() {
    try {
        const res = await fetch(`${Auth.apiBase}/settings/public`); // Auth.apiBase might not be defined if auth.js not loaded?
        // Fallback or check if Auth exists
        const apiBase = (typeof Auth !== 'undefined' && Auth.apiBase) ? Auth.apiBase : '/api';

        if (!res.ok) {
            // Try explicit path if Auth object missing
            const res2 = await fetch('/api/settings/public');
            if (res2.ok) processSettings(await res2.json());
            return;
        }

        const settings = await res.json();
        processSettings(settings);
    } catch (err) {
        console.error('Settings load error:', err);
    }
}

function processSettings(settings) {
    // 1. Disable Right Click
    if (settings.disableRightClick) {
        // Allow on Admin Dashboard
        if (!window.location.pathname.includes('admin-dashboard')) {
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                // Optional: Show toast? No, just disable silently or consistent with user request "disable right click"
            });
        }
    }

    // 2. Maintenance Check (Optional redirect logic here if needed, but Middleware does heavy lifting)
    if (settings.isMaintenanceMode && !window.location.pathname.includes('admin') && !window.location.pathname.includes('login')) {
        // Maybe show a banner?
        const banner = document.createElement('div');
        banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:var(--color-error, red); color:white; text-align:center; padding:10px; z-index:9999; font-weight:bold;';
        banner.textContent = settings.maintenanceMessage || 'Maintenance Mode Active';
        document.body.prepend(banner);
    }
}
