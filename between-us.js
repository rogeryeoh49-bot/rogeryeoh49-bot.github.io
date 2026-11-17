/* Progressive interactions confined to BETWEEN US. Native scrolling is untouched. */
(() => {
    const modal = document.getElementById('projectModal');
    const details = document.getElementById('modalBetweenDetails');
    const scrollRoot = modal?.querySelector('.modal-scroll');
    if (!modal || !details || !scrollRoot) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const art = details.querySelector('[data-between-presences]');
    const memory = details.querySelector('.between-memory');
    const memoryToggle = document.getElementById('betweenMemoryToggle');
    const history = document.getElementById('betweenMemoryHistory');
    const status = document.getElementById('betweenMemoryStatus');
    const revealTargets = [...details.querySelectorAll('[data-between-reveal]')];
    let observer;
    let pointerFrame;
    let open = false;

    function resetArt() {
        cancelAnimationFrame(pointerFrame);
        art.style.removeProperty('--between-x');
        art.style.removeProperty('--between-y');
        art.style.removeProperty('--between-connection');
    }

    function resetMemory() {
        memory.classList.remove('is-forgotten');
        memoryToggle.setAttribute('aria-expanded', 'true');
        memoryToggle.innerHTML = 'Hide shared history <span aria-hidden="true">−</span>';
        history.hidden = false;
        status.textContent = 'Shared history present.';
    }

    function clearReveals() {
        observer?.disconnect();
        revealTargets.forEach(target => target.classList.remove('is-pending'));
    }

    function startReveals() {
        clearReveals();
        if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
        observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.remove('is-pending');
                observer.unobserve(entry.target);
            }
        }, { root: scrollRoot, threshold: .05 });
        revealTargets.forEach(target => {
            target.classList.add('between-reveal', 'is-pending');
            observer.observe(target);
        });
    }

    new MutationObserver(() => {
        const nextOpen = modal.classList.contains('active') && modal.classList.contains('is-between');
        if (nextOpen === open) return;
        open = nextOpen;
        if (open) {
            resetMemory();
            startReveals();
        } else {
            clearReveals();
            resetArt();
        }
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });

    details.querySelectorAll('[data-between-chapter]').forEach(button => {
        button.addEventListener('click', () => {
            const section = document.getElementById(button.dataset.betweenChapter);
            section.focus({ preventScroll: true });
            section.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
        });
    });

    memoryToggle.addEventListener('click', () => {
        const forgotten = memory.classList.toggle('is-forgotten');
        memoryToggle.setAttribute('aria-expanded', String(!forgotten));
        memoryToggle.innerHTML = forgotten
            ? 'Restore shared history <span aria-hidden="true">+</span>'
            : 'Hide shared history <span aria-hidden="true">−</span>';
        history.hidden = forgotten;
        status.textContent = forgotten ? 'Shared history absent. What remains the same?' : 'Shared history present.';
    });

    art.addEventListener('pointermove', event => {
        if (reducedMotion.matches || event.pointerType !== 'mouse') return;
        const bounds = art.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        cancelAnimationFrame(pointerFrame);
        pointerFrame = requestAnimationFrame(() => {
            art.style.setProperty('--between-x', `${x * 10}px`);
            art.style.setProperty('--between-y', `${y * 8}px`);
            art.style.setProperty('--between-connection', String(.35 + (.5 - Math.abs(x)) * .7));
        });
    }, { passive: true });
    art.addEventListener('pointerleave', resetArt);
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) {
            clearReveals();
            resetArt();
        }
    });
})();
