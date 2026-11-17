/* A pointer glint on the glass surfaces. No interference with clicks or scrolling. */
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const surfaces = [...document.querySelectorAll('.liquid-glass')];
    for (const surface of surfaces) {
        let frame = null;
        const reset = () => {
            cancelAnimationFrame(frame);
            surface.style.removeProperty('--glass-x');
            surface.style.removeProperty('--glass-y');
        };
        surface.addEventListener('pointermove', event => {
            if (reducedMotion.matches || event.pointerType !== 'mouse') return;
            const rect = surface.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width * 100;
            const y = (event.clientY - rect.top) / rect.height * 100;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                surface.style.setProperty('--glass-x', `${x}%`);
                surface.style.setProperty('--glass-y', `${y}%`);
            });
        }, { passive: true });
        surface.addEventListener('pointerleave', reset);
        reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) reset(); });
    }
})();
