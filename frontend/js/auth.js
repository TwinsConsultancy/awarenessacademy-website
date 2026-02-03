/**
 * InnerSpark - Common Auth Utility
 */

const Auth = {
    // Check if user is logged in
    checkAuth: (allowedRoles = []) => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        if (!token || !user) {
            window.location.href = 'login.html';
            return;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            alert('Access Denied: You do not have permission to view this page.');
            window.location.href = 'index.html';
            return;
        }

        return { token, user };
    },

    // Logout
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    },

    // Get auth headers
    getHeaders: () => {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    // API Base URL
    apiBase: (typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:5001/api')
};

// Global Logout Handler
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
});
