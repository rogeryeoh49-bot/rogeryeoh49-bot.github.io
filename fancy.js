/* Progressive visual effects only: the site and carousel work without this file. */
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let scrollFrame = 0;
    const stopScroll = () => { cancelAnimationFrame(scrollFrame); scrollFrame = 0; };
    ['wheel', 'touchstart', 'pointerdown'].forEach(type => window.addEventListener(type, stopScroll, { passive: true }));
    window.addEventListener('keydown', event => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopScroll();
    });
    // Keep native anchor destinations and history, with a gentle scroll from the hero.
    document.querySelectorAll('.hero-links a[href^="#"]').forEach(link => {
        link.addEventListener('click', event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const target = document.getElementById(link.hash.slice(1));
            if (!target) return;
            event.preventDefault();
            if (location.hash !== link.hash) history.pushState(null, '', link.hash);
            target.focus({ preventScroll: true });
            stopScroll();
            if (reducedMotion.matches) {
                target.scrollIntoView({ behavior: 'auto', block: 'start' });
                return;
            }
            const from = window.scrollY;
            const to = Math.min(from + target.getBoundingClientRect().top, document.documentElement.scrollHeight - window.innerHeight);
            const duration = Math.min(1800, Math.max(1300, Math.abs(to - from) * 0.7));
            let start;
            function step(now) {
                if (start === undefined) start = now;
                const progress = Math.min((now - start) / duration, 1);
                const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
                window.scrollTo(0, from + (to - from) * eased);
                if (progress < 1) scrollFrame = requestAnimationFrame(step);
                else scrollFrame = 0;
            }
            scrollFrame = requestAnimationFrame(step);
        });
    });

})();
