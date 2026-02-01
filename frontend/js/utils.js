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
document.addEventListener('DOMContentLoaded', () => UI.init());
