// Scale 1442px canvas to viewport width via CSS zoom (matches index.html)
(function () {
    const canvas = document.querySelector('.canvas');
    if (!canvas) return;
    function scale() {
        const vw = document.documentElement.clientWidth;
        const s = vw / 1442;
        canvas.style.zoom = s;
    }
    scale();
    window.addEventListener('resize', scale);
})();

// Footer logo stretch on scroll-to-bottom
(function () {
    const footerLogo = document.querySelector('.footer-logo');
    if (!footerLogo) return;

    window.addEventListener('scroll', function () {
        requestAnimationFrame(function () {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPos = window.scrollY;
            const distanceToBottom = maxScroll - scrollPos;
            let scale = 1;
            if (distanceToBottom <= 20) {
                footerLogo.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                footerLogo.style.transform = 'scaleY(1)';
            } else if (distanceToBottom < 900) {
                footerLogo.style.transition = 'none';
                const progress = 1 - (distanceToBottom / 900);
                scale = 1 + Math.pow(progress, 3) * 0.5;
                footerLogo.style.transform = `scaleY(${scale})`;
            } else {
                footerLogo.style.transition = 'none';
                footerLogo.style.transform = 'scaleY(1)';
            }
        });
    });
})();

// Mark active nav item based on current pathname
(function () {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item').forEach(function (a) {
        const href = a.getAttribute('href');
        if (href === path || (path === '' && href === 'index.html')) {
            a.classList.add('is-active');
        }
    });
})();
