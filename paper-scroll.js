(() => {
    const link = document.querySelector('.paper-to-beginning');
    const target = document.getElementById('paper-text');
    if (!link || !target) return;
    link.addEventListener('click', event => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        event.preventDefault();
        const start = window.scrollY;
        const end = Math.max(0, target.getBoundingClientRect().top + start);
        const duration = Math.min(1400, Math.max(500, Math.abs(end - start) * 0.35));
        let started;
        const step = now => {
            if (started === undefined) started = now;
            const progress = Math.min(1, (now - started) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            window.scrollTo(0, start + (end - start) * eased);
            if (progress < 1) requestAnimationFrame(step);
            else { history.replaceState(null, '', '#paper-text'); target.focus({ preventScroll: true }); }
        };
        requestAnimationFrame(step);
    });
})();
