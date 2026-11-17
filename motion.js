/* Adapter for Apple's source StaggeredFadeIn/Card behavior. Original source
   excerpts and CSS live in vendor/apple/reveal.*. No Apple runtime/analytics. */
(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const groups = [];
    const running = new Set();
    // Verbatim function from Apple's overview/main.built.js.
    const easeInOutQuad = function(e){return e<.5?2*e*e:(4-2*e)*e-1};
    const query = selector => [...document.querySelectorAll(selector)];
    function group(anchor, items) {
        if (!anchor || !items.length) return;
        anchor.dataset.componentList = 'StaggeredFadeIn';
        items.forEach(item => {
            item.dataset.staggeredItem = '';
            item.classList.add('motion-waiting');
        });
        const css = getComputedStyle(anchor);
        groups.push({ anchor, items, done: false, frame: null,
            delay: Number(css.getPropertyValue('--staggered-delay')) * 1000,
            opacityDuration: Number(css.getPropertyValue('--staggered-opacity-duration')) * 1000,
            yDuration: Number(css.getPropertyValue('--staggered-translate-y-duration')) * 1000,
            y: parseFloat(css.getPropertyValue('--staggered-translate-y')) });
    }
    group(document.querySelector('.hero-center'), query('.hero-name, .hero-aside > *'));
    group(document.querySelector('.about-copy'), query('.about-copy > *'));
    group(document.querySelector('.about-art'), query('.about-art'));
    group(document.querySelector('.feature-carousel-header'), query('.feature-carousel-header'));
    group(document.querySelector('.feature-carousel'), query('.feature-carousel'));
    group(document.querySelector('.projects-header'), query('.projects-header'));
    // Group desktop cards by visual row; on mobile each row is one card.
    const cards = query('.project-card');
    const rows = [];
    for (const card of cards) {
        const top = card.getBoundingClientRect().top;
        let row = rows.find(row => Math.abs(row.top - top) < 8);
        if (!row) rows.push(row = { top, items: [] });
        row.items.push(card);
    }
    rows.forEach(row => group(row.items[0], row.items));
    const savedHeader = document.querySelector('.saved-links-header');
    group(savedHeader, savedHeader ? [...savedHeader.children] : []);
    group(document.querySelector('.saved-links-grid'), query('.saved-link'));

    function finish(state) {
        cancelAnimationFrame(state.frame);
        state.done = true;
        state.anchor.classList.add('staggered-end');
        state.anchor.classList.remove('staggered-start');
        for (const item of state.items) {
            item.classList.remove('motion-waiting', 'motion-playing');
            item.style.removeProperty('opacity');
            item.style.removeProperty('translate');
        }
        running.delete(state);
    }
    function play(state) {
        if (state.done || running.has(state)) return;
        observer?.unobserve(state.anchor);
        if (reduce.matches) return finish(state);
        running.add(state);
        state.anchor.classList.add('staggered-start');
        state.items.forEach(item => item.classList.add('motion-playing'));
        const started = performance.now();
        const fraction = (time, duration) => Math.max(0, Math.min(1, time / duration));
        function draw(now) {
            const time = now - started;
            state.items.forEach((item, index) => {
                const elapsed = time - index * state.delay;
                item.style.opacity = easeInOutQuad(fraction(elapsed, state.opacityDuration));
                item.style.translate = `0 ${state.y * (1 - easeInOutQuad(fraction(elapsed, state.yDuration)))}px`;
            });
            const end = (state.items.length - 1) * state.delay + Math.max(state.opacityDuration, state.yDuration);
            if (time >= end) finish(state);
            else state.frame = requestAnimationFrame(draw);
        }
        state.frame = requestAnimationFrame(draw);
    }
    let observer;
    if (!reduce.matches && 'IntersectionObserver' in window) {
        // Apple's original trigger: top reaches 85vh. Use a pixel margin so
        // IntersectionObserver's percentage-width interpretation cannot shift it.
        const observe = () => {
            observer?.disconnect();
            observer = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) play(groups.find(state => state.anchor === entry.target));
                }
            }, { rootMargin: `0px 0px -${innerHeight * .15}px 0px`, threshold: 0 });
            groups.filter(state => !state.done && !running.has(state)).forEach(state => {
                const rect = state.anchor.getBoundingClientRect();
                // Keep already-scrolled-past content visible on hash/history loads.
                if (rect.bottom <= 0) finish(state);
                else if (rect.top < innerHeight * .85) play(state);
                else observer.observe(state.anchor);
            });
        };
        observe();
        addEventListener('resize', observe, { passive: true });
    } else groups.forEach(finish);
    // Keyboard navigation and user motion settings must reveal content immediately.
    document.addEventListener('focusin', event => {
        groups.filter(state => !state.done && state.items.some(item => item === event.target || item.contains(event.target))).forEach(finish);
    });
    reduce.addEventListener('change', () => {
        if (reduce.matches) { observer?.disconnect(); groups.forEach(finish); }
    });
    addEventListener('beforeprint', () => groups.forEach(finish));

    // Apple's Card._setCardWidthCSSVar: scale = (width + 6) / width.
    const hoverCards = query('.project-card, .saved-link');
    const resize = new ResizeObserver(entries => {
        for (const { target } of entries) {
            const width = target.offsetWidth;
            if (width) target.style.setProperty('--card-element-scale', ((width + 6) / width).toString());
        }
    });
    hoverCards.forEach(card => { card.classList.add('card-hover'); resize.observe(card); });
})();
