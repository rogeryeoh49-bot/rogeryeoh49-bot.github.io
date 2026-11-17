(() => {
    const video = document.querySelector('.linernotes-demo-screen video');
    const play = document.getElementById('demo-play');
    const sound = document.getElementById('demo-sound');
    if (!video || !play || !sound) return;
    if (window.parent !== window && new URLSearchParams(location.search).get('embedded') === '1') {
        window.addEventListener('message', event => {
            if (event.origin !== location.origin || event.source !== window.parent ||
                event.data?.type !== 'linernotes-video-preloaded' ||
                typeof event.data.url !== 'string' || !event.data.url.startsWith('blob:' + location.origin + '/')) return;
            // Do not interrupt playback that has already started.
            if (video.currentTime > 0.1 || !video.paused) return;
            video.src = event.data.url;
            video.load();
        });
    }
    const updatePlay = () => {
        play.classList.toggle('is-paused', video.paused);
        play.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
    };
    const updateSound = () => {
        sound.innerHTML = video.muted
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12 1 5 5m0-5-5 5"/></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12-1a6 6 0 0 1 0 8m2-11a10 10 0 0 1 0 14"/></svg>';
        sound.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
        sound.setAttribute('aria-pressed', String(!video.muted));
    };
    play.addEventListener('click', () => {
        if (video.paused) video.play().catch(updatePlay);
        else video.pause();
    });
    sound.addEventListener('click', () => { video.muted = !video.muted; });
    video.addEventListener('play', updatePlay);
    video.addEventListener('pause', updatePlay);
    video.addEventListener('volumechange', updateSound);
    updatePlay();
    updateSound();
})();

if (window.parent !== window && new URLSearchParams(location.search).get('embedded') === '1') {
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') window.parent.postMessage('linernotes-close', location.origin);
    });
}
