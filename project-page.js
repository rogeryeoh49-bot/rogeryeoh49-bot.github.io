/* The Between Us thought experiment on its standalone reading page. */
(() => {
    const toggle = document.getElementById('betweenMemoryToggle');
    const history = document.getElementById('betweenMemoryHistory');
    const status = document.getElementById('betweenMemoryStatus');
    const memory = toggle?.closest('.between-memory');
    if (!toggle || !history || !status || !memory) return;
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
        const forgotten = memory.classList.toggle('is-forgotten');
        toggle.setAttribute('aria-expanded', String(!forgotten));
        toggle.innerHTML = forgotten
            ? 'Restore shared history <span aria-hidden="true">+</span>'
            : 'Hide shared history <span aria-hidden="true">−</span>';
        history.hidden = forgotten;
        status.textContent = forgotten ? 'Shared history absent.' : 'Shared history present.';
    });
})();
