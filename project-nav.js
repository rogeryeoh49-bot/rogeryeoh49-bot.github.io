(() => {
    const nav = document.querySelector('.navbar-floating');
    if (!nav) return;
    const update = () => {
        const visible = window.scrollY > 200;
        nav.classList.toggle('show', visible);
        nav.setAttribute('aria-hidden', String(!visible));
        nav.inert = !visible;
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
})();
