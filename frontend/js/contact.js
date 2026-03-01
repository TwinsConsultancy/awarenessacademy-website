const API_BASE_URL = 'https://awarenessacademy.in/api';

// Form validation and submission
async function submitContactForm(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;

    // Get form values
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value.trim();

    // Clear previous errors
    clearErrors();

    // Client-side validation
    let hasError = false;

    // Validate name (2-100 characters, letters and spaces only)
    if (!name || name.length < 2 || name.length > 100) {
        showError('contactName', 'Name must be 2-100 characters');
        hasError = true;
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
        showError('contactName', 'Name can only contain letters and spaces');
        hasError = true;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        showError('contactEmail', 'Please enter a valid email address');
        hasError = true;
    }

    // Validate subject
    if (!subject) {
        showError('contactSubject', 'Please select a subject');
        hasError = true;
    }

    // Validate message (10-2000 characters)
    if (!message || message.length < 10) {
        showError('contactMessage', 'Message must be at least 10 characters');
        hasError = true;
    } else if (message.length > 2000) {
        showError('contactMessage', 'Message cannot exceed 2000 characters');
        hasError = true;
    }

    if (hasError) {
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const response = await fetch(`${API_BASE_URL}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                subject,
                message
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Show success message
            showSuccessMessage(data.message);

            // Reset form
            document.getElementById('contactForm').reset();

            // Update character counter
            updateCharCount();
        } else {
            // Show error message
            showErrorMessage(data.message || 'Failed to send message. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Network error. Please check your connection and try again.');
    } finally {
        // Restore button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');

    // Add error class
    field.classList.add('error');

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

    formGroup.appendChild(errorDiv);
}

function clearErrors() {
    // Remove all error messages
    document.querySelectorAll('.error-message').forEach(el => el.remove());

    // Remove error classes
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function showSuccessMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-success';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div>
            <strong>Success!</strong>
            <p>${message}</p>
        </div>
    `;

    const formWrapper = document.querySelector('.contact-form-wrapper');
    formWrapper.insertBefore(alertDiv, formWrapper.firstChild);

    // Remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);

    // Scroll to top of form
    formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showErrorMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-error';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <div>
            <strong>Error</strong>
            <p>${message}</p>
        </div>
    `;

    const formWrapper = document.querySelector('.contact-form-wrapper');
    formWrapper.insertBefore(alertDiv, formWrapper.firstChild);

    // Remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);

    // Scroll to top of form
    formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Character counter for message field
function updateCharCount() {
    const messageField = document.getElementById('contactMessage');
    const charCount = document.getElementById('charCount');

    if (messageField && charCount) {
        const length = messageField.value.length;
        const maxLength = 2000;

        charCount.textContent = `${length}/${maxLength}`;

        if (length > maxLength) {
            charCount.style.color = '#ef4444';
        } else if (length > maxLength * 0.9) {
            charCount.style.color = '#f59e0b';
        } else {
            charCount.style.color = '#6b7280';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', submitContactForm);
    }

    const messageField = document.getElementById('contactMessage');
    if (messageField) {
        messageField.addEventListener('input', updateCharCount);
        updateCharCount(); // Initial count
    }

    // Clear errors on input
    document.querySelectorAll('.form-control').forEach(field => {
        field.addEventListener('input', function () {
            if (this.classList.contains('error')) {
                this.classList.remove('error');
                const errorMsg = this.closest('.form-group').querySelector('.error-message');
                if (errorMsg) errorMsg.remove();
            }
        });
    });
});
