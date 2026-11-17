/* A reload starts at the hero; ordinary anchor navigation stays native. */
(() => {
    if (performance.getEntriesByType('navigation')[0]?.type !== 'reload') return;
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    scrollTo(0, 0);
    addEventListener('pageshow', () => {
        scrollTo(0, 0);
        requestAnimationFrame(() => {
            scrollTo(0, 0);
            history.scrollRestoration = previousRestoration;
        });
    }, { once: true });
})();
