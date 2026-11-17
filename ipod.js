(() => {
    const device = document.querySelector('[data-ipod]');
    if (!device) return;

    const screen = device.querySelector('[data-ipod-screen]');
    const wheel = device.querySelector('[data-ipod-wheel]');
    const status = document.querySelector('[data-ipod-status]');
    const storageKey = 'roger-ipod:settings';
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tracks = [
        { title: 'Take California', artist: 'Propellerheads', album: 'Decksandrumsandrockandroll', duration: 447 },
        { title: 'Feel Good Inc.', artist: 'Gorillaz', album: 'Demon Days', duration: 221 },
        { title: 'Technologic', artist: 'Daft Punk', album: 'Human After All', duration: 284 },
        { title: 'Jerk It Out', artist: 'Caesars', album: 'Paper Tigers', duration: 196 },
        { title: 'Are You Gonna Be My Girl', artist: 'Jet', album: 'Get Born', duration: 213 },
        { title: 'Bruises', artist: 'Chairlift', album: 'Does You Inspire You', duration: 243 },
        { title: 'Lose Yourself', artist: 'Eminem', album: '8 Mile', duration: 326 },
        { title: 'Walkie Talkie Man', artist: 'Steriogram', album: 'Schmack!', duration: 133 },
        { title: 'The Middle', artist: 'Jimmy Eat World', album: 'Bleed American', duration: 166 },
        { title: 'Clocks', artist: 'Coldplay', album: 'A Rush of Blood to the Head', duration: 307 },
        { title: 'Crazy in Love', artist: 'Beyoncé', album: 'Dangerously in Love', duration: 236 },
        { title: 'Seven Nation Army', artist: 'The White Stripes', album: 'Elephant', duration: 231 }
    ];

    const defaults = { shuffle: 'Off', repeat: 'Off', backlight: '3 sec', clicker: 'On', volume: 50 };
    let settings = { ...defaults };
    try { settings = { ...settings, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch (_) {}

    let stack = [];
    let mode = 'menu';
    let currentTrack = -1;
    let queue = tracks;
    let playing = false;
    let elapsed = 0;
    let seekMode = false;
    let backlightTimer = 0;
    let audioContext;
    let gesture = null;
    let holdTimer = 0;
    let repeatTimer = 0;
    let repeatInterval = 0;
    let suppressClick = false;
    let brick = null;
    let brickFrame = 0;

    const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
    const modulo = (number, length) => ((number % length) + length) % length;
    const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    const saveSettings = () => localStorage.setItem(storageKey, JSON.stringify(settings));
    const makeFrame = (id, title, items) => ({ id, title, items, selected: 0 });
    const trackItem = (track) => ({ label: track.title, meta: track.artist, kind: 'track', track });

    const playlistFrame = (name, list = tracks) => makeFrame(`playlist-${name}`, name, list.map(trackItem));
    const playlistsFrame = () => makeFrame('playlists', 'Playlists', [
        { label: 'Songs From iPod Ads', kind: 'open', frame: () => playlistFrame('iPod Ads', tracks.slice(0, 8)) },
        { label: 'Alternative Hits: 2001', kind: 'open', frame: () => playlistFrame('Alternative', tracks.slice(3, 10)) },
        { label: 'Pop Hits: 2001', kind: 'open', frame: () => playlistFrame('Pop Hits', tracks.slice(6)) },
        { label: 'Roger’s Favourites', kind: 'open', frame: () => playlistFrame('Favourites', [tracks[9], tracks[4], tracks[1], tracks[10]]) }
    ]);
    const artistsFrame = () => {
        const artists = [...new Set(tracks.map((track) => track.artist))].sort();
        return makeFrame('artists', 'Artists', artists.map((artist) => ({
            label: artist,
            kind: 'open',
            frame: () => playlistFrame(artist, tracks.filter((track) => track.artist === artist))
        })));
    };
    const songsFrame = () => playlistFrame('Songs', tracks);
    const settingsFrame = () => makeFrame('settings', 'Settings', [
        { label: 'About', kind: 'about', chevron: true },
        { label: 'Shuffle', kind: 'setting', key: 'shuffle', values: ['Off', 'Songs'] },
        { label: 'Repeat', kind: 'setting', key: 'repeat', values: ['Off', 'One', 'All'] },
        { label: 'Backlight Timer', kind: 'setting', key: 'backlight', values: ['Off', '1 sec', '2 sec', '3 sec', '5 sec', 'Always On'] },
        { label: 'Clicker', kind: 'setting', key: 'clicker', values: ['Off', 'On'] },
        { label: 'Reset All Settings', kind: 'reset' }
    ]);
    const aboutFrame = () => makeFrame('about', 'About', [
        { label: 'iPod', value: 'Web Tribute', kind: 'info' },
        { label: 'Songs', value: String(tracks.length), kind: 'info' },
        { label: 'Made for', value: 'Roger', kind: 'info' },
        { label: 'Version', value: '1.0', kind: 'info' }
    ]);
    const rootFrame = () => {
        const frame = makeFrame('main', 'iPod', [
            { label: 'Playlists', kind: 'open', frame: playlistsFrame },
            { label: 'Artists', kind: 'open', frame: artistsFrame },
            { label: 'Songs', kind: 'open', frame: songsFrame },
            { label: 'Settings', kind: 'open', frame: settingsFrame },
            { label: 'About', kind: 'about', chevron: true },
            { label: 'Now Playing', kind: 'now', chevron: true }
        ]);
        frame.selected = 2;
        return frame;
    };
    const currentFrame = () => stack[stack.length - 1];

    const topBar = (title, right = '') => `
        <div class="ipod-screen-bar">
            <span class="ipod-play-state" aria-hidden="true">${playing ? '▶' : ''}</span>
            <strong>${escapeHtml(title)}</strong>
            ${right || '<span class="ipod-battery" aria-label="Battery full"><i></i></span>'}
        </div>`;

    const touchBacklight = () => {
        clearTimeout(backlightTimer);
        const display = device.querySelector('.ipod-screen');
        if (settings.backlight === 'Off') {
            display.classList.remove('is-backlit');
            return;
        }
        display.classList.add('is-backlit');
        if (settings.backlight !== 'Always On') {
            const seconds = parseInt(settings.backlight, 10) || 3;
            backlightTimer = setTimeout(() => display.classList.remove('is-backlit'), seconds * 1000);
        }
    };

    const clicker = () => {
        if (settings.clicker !== 'On') return;
        try {
            audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.frequency.value = 1150;
            gain.gain.setValueAtTime(0.025, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.018);
            oscillator.connect(gain).connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.02);
        } catch (_) {}
    };

    const renderMenu = () => {
        mode = 'menu';
        stopBrick();
        const frame = currentFrame();
        const items = frame.items;
        frame.selected = Math.min(frame.selected, Math.max(0, items.length - 1));
        const rows = items.map((item, index) => {
            const trailing = item.kind === 'setting' ? settings[item.key] : item.value || ((item.kind === 'open' || item.chevron) ? '›' : '');
            return `<li id="ipod-option-${index}" role="option" aria-selected="${index === frame.selected}" class="${index === frame.selected ? 'is-selected' : ''}"><span>${escapeHtml(item.label)}</span><b>${escapeHtml(trailing)}</b>${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ''}</li>`;
        }).join('');
        screen.innerHTML = `${topBar(frame.title)}<div class="ipod-list-window"><ul class="ipod-menu" role="listbox" aria-label="${escapeHtml(frame.title)}" aria-activedescendant="ipod-option-${frame.selected}">${rows}</ul></div>`;
        screen.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' });
        status.textContent = `${items[frame.selected]?.label || frame.title}`.toUpperCase();
        touchBacklight();
    };

    const renderNowPlaying = () => {
        if (currentTrack < 0) return;
        mode = 'now';
        stopBrick();
        const track = queue[currentTrack];
        const percent = Math.min(100, elapsed / track.duration * 100);
        const right = `<span class="ipod-track-count">${currentTrack + 1} of ${queue.length}</span>`;
        screen.innerHTML = `${topBar('Now Playing', right)}
            <div class="ipod-now-playing">
                <p class="ipod-song-title">${escapeHtml(track.title)}</p>
                <p>${escapeHtml(track.artist)}</p>
                <p>${escapeHtml(track.album)}</p>
                <div class="ipod-progress"><i style="width:${percent}%"></i></div>
                <div class="ipod-time"><span>${formatTime(elapsed)}</span><span>-${formatTime(Math.max(0, track.duration - elapsed))}</span></div>
                <div class="ipod-volume-row"><span>${seekMode ? 'SEEK' : 'VOL'}</span><div class="ipod-volume"><i style="width:${seekMode ? percent : settings.volume}%"></i></div></div>
            </div>`;
        status.textContent = seekMode ? 'TURN TO SCRUB · CENTER FOR VOLUME' : 'TURN FOR VOLUME · CENTER TO SCRUB';
        touchBacklight();
    };

    const adjustVolume = (amount) => {
        settings.volume = Math.max(0, Math.min(100, settings.volume + amount));
        saveSettings();
        clicker();
        renderNowPlaying();
    };

    const adjustSeek = (amount) => {
        if (currentTrack < 0) return;
        elapsed = Math.max(0, Math.min(queue[currentTrack].duration, elapsed + amount));
        clicker();
        renderNowPlaying();
    };

    const moveSelection = (step) => {
        touchBacklight();
        if (mode === 'brick') {
            if (brick) brick.paddle = Math.max(7, Math.min(93, brick.paddle + step * 2.3));
            return;
        }
        if (mode === 'now') {
            if (seekMode) adjustSeek(step * 2);
            else adjustVolume(step * 2);
            return;
        }
        const frame = currentFrame();
        if (!frame.items.length) return;
        frame.selected = modulo(frame.selected + step, frame.items.length);
        clicker();
        renderMenu();
    };

    const playTrack = (track, list) => {
        queue = list.length ? list : tracks;
        currentTrack = Math.max(0, queue.indexOf(track));
        elapsed = 0;
        playing = true;
        seekMode = false;
        renderNowPlaying();
    };

    const select = () => {
        touchBacklight();
        if (mode === 'brick') {
            if (brick) brick.launched = true;
            return;
        }
        if (mode === 'now') {
            seekMode = !seekMode;
            clicker();
            renderNowPlaying();
            return;
        }
        const frame = currentFrame();
        const item = frame.items[frame.selected];
        if (!item) return;
        clicker();
        if (item.kind === 'open') {
            stack.push(item.frame());
            renderMenu();
        } else if (item.kind === 'track') {
            playTrack(item.track, frame.items.filter((entry) => entry.track).map((entry) => entry.track));
        } else if (item.kind === 'setting') {
            const values = item.values;
            settings[item.key] = values[(values.indexOf(settings[item.key]) + 1) % values.length];
            saveSettings();
            renderMenu();
        } else if (item.kind === 'about') {
            stack.push(aboutFrame());
            renderMenu();
        } else if (item.kind === 'reset') {
            settings = { ...defaults };
            saveSettings();
            renderMenu();
        } else if (item.kind === 'now') {
            if (currentTrack < 0) playTrack(tracks[0], tracks);
            else renderNowPlaying();
        }
    };

    const menu = (root = false) => {
        touchBacklight();
        clicker();
        seekMode = false;
        if (mode === 'brick' || mode === 'now') mode = 'menu';
        else if (!root && stack.length > 1) stack.pop();
        else stack = [rootFrame()];
        renderMenu();
    };

    const skip = (direction) => {
        if (currentTrack < 0) {
            moveSelection(direction);
            return;
        }
        currentTrack = modulo(currentTrack + direction, queue.length);
        elapsed = 0;
        playing = true;
        renderNowPlaying();
    };

    const togglePlay = () => {
        if (currentTrack < 0) playTrack(tracks[0], tracks);
        else {
            playing = !playing;
            renderNowPlaying();
        }
    };

    function stopBrick() {
        cancelAnimationFrame(brickFrame);
        brickFrame = 0;
        brick = null;
    }

    const renderBrick = () => {
        if (!brick) return;
        screen.innerHTML = `${topBar('Brick', `<span class="ipod-track-count">${brick.score} · ${brick.balls} balls</span>`)}
            <div class="ipod-brick-field" aria-label="Brick game. Turn the wheel to move the paddle and press the center button to launch.">
                ${brick.bricks.map((item) => item.alive ? `<i class="ipod-brick" style="left:${item.x}%;top:${item.y}%"></i>` : '').join('')}
                <i class="ipod-ball" style="left:${brick.x}%;top:${brick.y}%"></i>
                <i class="ipod-paddle" style="left:${brick.paddle}%"></i>
                ${brick.launched ? '' : '<span class="ipod-brick-help">PRESS CENTER</span>'}
            </div>`;
        status.textContent = 'BRICK · TURN WHEEL TO MOVE';
    };

    const startBrick = () => {
        stopBrick();
        mode = 'brick';
        brick = {
            paddle: 50, x: 50, y: 78, vx: 0.16, vy: -0.22, balls: 3, score: 0, launched: false,
            bricks: Array.from({ length: 24 }, (_, index) => ({ x: 4 + (index % 12) * 8, y: 8 + Math.floor(index / 12) * 9, alive: true }))
        };
        let previous = performance.now();
        const tick = (now) => {
            if (!brick || mode !== 'brick') return;
            const delta = Math.min(2, (now - previous) / 16.67);
            previous = now;
            if (brick.launched && !reducedMotion) {
                brick.x += brick.vx * delta * 10;
                brick.y += brick.vy * delta * 10;
                if (brick.x < 2 || brick.x > 98) brick.vx *= -1;
                if (brick.y < 3) brick.vy = Math.abs(brick.vy);
                brick.bricks.forEach((item) => {
                    if (item.alive && Math.abs(brick.x - item.x) < 4.5 && Math.abs(brick.y - item.y) < 5) {
                        item.alive = false;
                        brick.vy = Math.abs(brick.vy);
                        brick.score += 10;
                    }
                });
                if (brick.y > 84 && brick.y < 91 && Math.abs(brick.x - brick.paddle) < 13) brick.vy = -Math.abs(brick.vy);
                if (brick.y > 103) {
                    brick.balls -= 1;
                    brick.x = brick.paddle;
                    brick.y = 78;
                    brick.vy = -Math.abs(brick.vy);
                    brick.launched = false;
                    if (brick.balls <= 0) {
                        brick.balls = 3;
                        brick.score = 0;
                        brick.bricks.forEach((item) => { item.alive = true; });
                    }
                }
            } else if (!brick.launched) {
                brick.x = brick.paddle;
                brick.y = 78;
            }
            renderBrick();
            brickFrame = requestAnimationFrame(tick);
        };
        renderBrick();
        brickFrame = requestAnimationFrame(tick);
    };

    const angleAt = (event, rect) => Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
    const normalizedDelta = (next, previous) => ((next - previous + 540) % 360) - 180;

    wheel.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button')) return;
        const rect = wheel.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const radius = Math.hypot(dx, dy);
        if (radius < rect.width * .245 || radius > rect.width * .51) return;
        wheel.setPointerCapture(event.pointerId);
        gesture = { pointerId: event.pointerId, angle: angleAt(event, rect), time: performance.now(), accumulator: 0, direction: 0, reversal: 0, directionSince: performance.now(), moved: false };
        touchBacklight();
        event.preventDefault();
    });

    wheel.addEventListener('pointermove', (event) => {
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        const rect = wheel.getBoundingClientRect();
        const now = performance.now();
        const nextAngle = angleAt(event, rect);
        const delta = normalizedDelta(nextAngle, gesture.angle);
        gesture.angle = nextAngle;
        if (Math.abs(delta) > 90) return;
        const direction = Math.sign(delta);
        if (direction && gesture.direction && direction !== gesture.direction) {
            gesture.reversal += Math.abs(delta);
            if (gesture.reversal < 8) return;
            gesture.directionSince = now;
            gesture.accumulator = 0;
        } else if (direction) gesture.reversal = 0;
        if (direction) gesture.direction = direction;
        gesture.accumulator += delta;
        if (!gesture.moved && Math.abs(gesture.accumulator) >= 8) {
            gesture.moved = true;
            clearButtonTimers();
        }
        const elapsedMs = Math.max(1, now - gesture.time);
        const speed = Math.abs(delta) / elapsedMs * 1000;
        gesture.time = now;
        const tier = speed < 180 ? 0 : Math.min(7, Math.floor((now - gesture.directionSince) / 500) + 1);
        const multipliers = [1, 2, 3, 5, 8, 13, 21, 34];
        while (Math.abs(gesture.accumulator) >= 14) {
            moveSelection(Math.sign(gesture.accumulator) * multipliers[tier]);
            gesture.accumulator -= Math.sign(gesture.accumulator) * 14;
        }
        event.preventDefault();
    });

    const endGesture = (event) => {
        if (gesture?.pointerId === event.pointerId) gesture = null;
    };
    wheel.addEventListener('pointerup', endGesture);
    wheel.addEventListener('pointercancel', endGesture);

    const clearButtonTimers = () => {
        clearTimeout(holdTimer);
        clearTimeout(repeatTimer);
        clearInterval(repeatInterval);
    };

    device.addEventListener('pointerdown', (event) => {
        const control = event.target.closest('[data-ipod-action]');
        if (!control) return;
        clearButtonTimers();
        suppressClick = false;
        const action = control.dataset.ipodAction;
        if (action === 'select' && mode === 'menu' && currentFrame().id === 'about') {
            holdTimer = setTimeout(() => { suppressClick = true; startBrick(); }, 5000);
        } else if (action === 'menu') {
            holdTimer = setTimeout(() => { suppressClick = true; menu(true); }, 850);
        } else if (action === 'prev' || action === 'next') {
            const direction = action === 'prev' ? -1 : 1;
            repeatTimer = setTimeout(() => {
                suppressClick = true;
                skip(direction);
                repeatInterval = setInterval(() => skip(direction), 500);
            }, 1000);
        }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => device.addEventListener(type, clearButtonTimers));

    device.addEventListener('click', (event) => {
        const control = event.target.closest('[data-ipod-action]');
        if (!control) return;
        if (suppressClick) { suppressClick = false; return; }
        const action = control.dataset.ipodAction;
        if (action === 'menu') menu();
        else if (action === 'prev') skip(-1);
        else if (action === 'next') skip(1);
        else if (action === 'play') togglePlay();
        else if (action === 'select') select();
    });

    device.addEventListener('keydown', (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const key = event.key;
        const isSelectKey = key === 'Enter' || key === ' ';

        if (mode === 'brick') {
            if (key === 'ArrowLeft') moveSelection(-2);
            else if (key === 'ArrowRight') moveSelection(2);
            else if (isSelectKey) select();
            else if (key === 'Escape') menu();
            else return;
        } else if (mode === 'now') {
            if (key === 'ArrowUp') adjustVolume(5);
            else if (key === 'ArrowDown') adjustVolume(-5);
            else if (key === 'ArrowLeft') adjustSeek(-5);
            else if (key === 'ArrowRight') adjustSeek(5);
            else if (key === 'Enter') select();
            else if (key === ' ') togglePlay();
            else if (key === 'Escape') menu();
            else return;
        } else {
            if (key === 'ArrowUp') moveSelection(-1);
            else if (key === 'ArrowDown') moveSelection(1);
            else if (key === 'ArrowLeft' || key === 'Escape') menu();
            else if (key === 'ArrowRight' || isSelectKey) select();
            else return;
        }

        event.preventDefault();
    });

    const progressTimer = setInterval(() => {
        if (!playing || mode === 'brick' || currentTrack < 0) return;
        const track = queue[currentTrack];
        elapsed += 1;
        if (elapsed >= track.duration) {
            if (settings.repeat === 'One') elapsed = 0;
            else if (currentTrack < queue.length - 1 || settings.repeat === 'All') skip(1);
            else playing = false;
        }
        if (mode === 'now') renderNowPlaying();
    }, 1000);

    window.addEventListener('pagehide', () => {
        clearInterval(progressTimer);
        stopBrick();
    });

    stack = [rootFrame()];
    renderMenu();
})();
