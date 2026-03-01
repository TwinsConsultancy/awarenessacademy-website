/**
 * InnerSpark - Parallax & Scroll Logic
 */

const API_URL = (typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'https://awarenessacademy.in/api');

document.addEventListener('DOMContentLoaded', () => {

    /* --- 1. Parallax Hero Effect --- */
    const heroBgText = document.getElementById('heroBgText');
    const nav = document.getElementById('mainNav');

    // Use requestAnimationFrame for smoother scroll
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateParallax() {
        const scrolled = window.scrollY;

        // Move Background Text
        if (heroBgText) {
            // Reduced parallax speed for subtle effect
            heroBgText.style.transform = `translate(-50%, -50%) translateX(${scrolled * 0.1}px)`;
        }

        // Nav Scroll Effect
        if (scrolled > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        // Horizontal Scroll
        updateHorizontalScroll(scrolled);

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        lastScrollY = window.scrollY;
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    });

    /* --- 2. Horizontal Scroll Section --- */
    const scrollContainer = document.getElementById('hScrollContainer');
    const track = document.getElementById('hScrollTrack');

    function updateHorizontalScroll(scrollY) {
        if (!scrollContainer || !track) return;

        // Get position relative to viewport
        const rect = scrollContainer.getBoundingClientRect();
        const containerTop = rect.top + scrollY; // Absolute top position
        const containerHeight = scrollContainer.offsetHeight;
        const viewportHeight = window.innerHeight;

        // Calculate visible progress
        // When container hits top of viewport (scrollY == containerTop), percentage should be 0
        // When container bottom hits bottom of viewport (scrollY == containerTop + containerHeight - viewportHeight), percentage should be 1

        const startScroll = containerTop;
        const endScroll = containerTop + containerHeight - viewportHeight;

        let percentage = (scrollY - startScroll) / (endScroll - startScroll);

        // Clamp percentage between 0 and 1
        percentage = Math.max(0, Math.min(1, percentage));

        // Calculate total scroll width of the track
        const trackWidth = track.scrollWidth;
        const maxTranslate = trackWidth - window.innerWidth;

        // Apply transform
        const translateX = maxTranslate * percentage;

        track.style.transform = `translateX(-${translateX}px)`;
    }

    /* --- 3. Newsletter Logic --- */
    // setupNewsletter(); // Moved to utils.js
});

function setupNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const originalHTML = btn.innerHTML; // Save icon

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;

            try {
                const formData = new FormData(form);
                const email = formData.get('email');

                const response = await fetch(`${API_URL}/subscribers/newsletter`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok) {
                    // Show success toast or alert
                    alert(data.message || 'Successfully subscribed!');
                    form.reset();
                } else {
                    alert(data.message || 'Subscription failed.');
                }

            } catch (err) {
                console.error(err);
                alert('Connection error. Please try again.');
            } finally {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        });
    }
}
