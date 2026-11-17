/* HDR for the floating glass navigation and hover exposure for all six cards.
   Reuse one GPU device and cache each surface at its current size.
   Original DOM, links, colors and hover behavior remain the fallback. */
(() => {
    const cards = [...document.querySelectorAll('#projects .project-card')];
    const navigation = document.querySelector('.navbar-floating');
    const navbar = navigation?.querySelector('.navbar-floating-inner');
    const navButton = navbar?.querySelector('.navbar-github');
    const title = document.querySelector('#projects .projects-header h2');
    const hdr = matchMedia('(dynamic-range: high)');
    const pointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const contrast = matchMedia('(forced-colors: active)');
    if ((!cards.length && !navbar && !title) || !navigator.gpu || !isSecureContext) return;
    const eligible = () => hdr.matches && !contrast.matches;
    const states = cards.map(card => ({
        card, hovered: false, generation: 0,
        imageOnly: ['project1', 'project2', 'project3', 'project4'].includes(card.dataset.project)
    }));
    // Floating navigation HDR is intentionally disabled so its 80% white
    // background and 20px blur match Apple's local navigation. Set this to
    // true to restore both the glass and GitHub button HDR layers. The rest
    // of the site's HDR effects are controlled independently.
    const plusStates = cards.filter(card => ['project1', 'project2', 'project3', 'project4'].includes(card.dataset.project))
        .map(card => ({ card: card.querySelector('.project-plus'), plus: true, parentCard: card, hovered: false, generation: 0 }));
    states.push(...plusStates);
    const enableNavigationHDR = false;
    const navState = enableNavigationHDR && navbar && { card: navbar, navigation: true, generation: 0 };
    if (navState) states.push(navState);
    const buttonState = enableNavigationHDR && navButton && { card: navButton, button: true, generation: 0 };
    if (buttonState) states.push(buttonState);
    const titleState = title && { card: title, heading: true, visible: false, generation: 0 };
    if (titleState) states.push(titleState);
    const activeClass = state => state.navigation ? 'navbar-hdr-active' :
        state.button ? 'navbar-button-hdr-active' :
        state.heading ? 'projects-title-hdr-active' : state.plus ? 'plus-hdr-active' : 'project-hdr-active';
    const embeddedImages = new Map();
    // These cards use a small subset of CSS. Copy resolved styles in one write,
    // instead of setting hundreds of irrelevant computed properties per node.
    const snapshotProperties = (`display position box-sizing width height min-width min-height max-width max-height
        margin-top margin-right margin-bottom margin-left padding-top padding-right padding-bottom padding-left
        border-top border-right border-bottom border-left border-radius background color opacity overflow
        font-family font-size font-weight font-style font-variant line-height letter-spacing text-transform
        text-align text-decoration white-space -webkit-text-fill-color -webkit-font-smoothing text-rendering
        top right bottom left z-index transform transform-origin aspect-ratio object-fit object-position
        flex-direction flex-wrap flex-grow flex-shrink flex-basis justify-content align-items align-self
        grid-template-columns grid-template-rows grid-column grid-row gap place-items box-shadow
        fill fill-opacity stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray`)
        .trim().split(/\s+/);
    let device, pipeline, initializing, stopped = false;

    function embedImage(url) {
        if (!embeddedImages.has(url)) {
            embeddedImages.set(url, fetch(url, { cache: 'force-cache' }).then(response => {
                if (!response.ok) throw new Error('Project image unavailable');
                return response.blob();
            }).then(blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            })).catch(error => { embeddedImages.delete(url); throw error; }));
        }
        return embeddedImages.get(url);
    }

    const desired = state => eligible() && !stopped && !document.hidden &&
        (state.navigation || state.button ? navigation.classList.contains('show') && !navigation.inert :
            state.heading ? state.visible :
            pointer.matches && state.hovered) &&
        !document.querySelector('dialog[open], .project-modal.active');

    function reset(state) {
        state.card.classList.remove(activeClass(state));
    }
    function dispose() {
        if (stopped) return;
        stopped = true;
        document.body.classList.remove('projects-hdr-enabled');
        for (const state of states) {
            reset(state);
            state.card.classList.remove('project-hdr-ready');
            state.generation++;
            state.texture?.destroy();
            state.context?.unconfigure();
            state.canvas?.remove();
        }
        device?.destroy();
    }

    function navbarSurface(width, height, scale) {
        // Paint just the light in the glass, behind the real links. No DOM
        // snapshot or backdrop capture: the native blur keeps following scroll.
        const source = document.createElement('canvas');
        source.width = Math.ceil(width * scale);
        source.height = Math.ceil(height * scale);
        const context = source.getContext('2d');
        context.scale(scale, scale);
        const radius = Math.min(parseFloat(getComputedStyle(navbar).borderTopLeftRadius), height / 2);
        const light = context.createLinearGradient(0, 0, 0, height);
        light.addColorStop(0, 'rgba(255,255,255,.72)');
        light.addColorStop(.5, 'rgba(255,255,255,.58)');
        light.addColorStop(1, 'rgba(255,255,255,.63)');
        context.beginPath();
        context.roundRect(.5, .5, width - 1, height - 1, radius);
        context.fillStyle = light;
        context.fill();
        context.strokeStyle = 'rgba(255,255,255,.9)';
        context.lineWidth = 1;
        context.stroke();
        return source;
    }

    function titleSurface(width, height, scale) {
        const padding = 16;
        const source = document.createElement('canvas');
        source.width = Math.ceil((width + padding * 2) * scale);
        source.height = Math.ceil((height + padding * 2) * scale);
        const context = source.getContext('2d');
        if (!('letterSpacing' in context)) throw new Error('Text spacing unavailable');
        const css = getComputedStyle(title);
        const bounds = title.getBoundingClientRect();
        const probe = document.createElement('i');
        probe.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline';
        title.append(probe);
        const baseline = probe.getBoundingClientRect().top - bounds.top;
        probe.remove();
        context.scale(scale, scale);
        context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        context.fontKerning = css.fontKerning;
        context.letterSpacing = css.letterSpacing;
        context.fillStyle = css.color;
        context.fillText(title.textContent.trim(), padding, baseline + padding);
        return source;
    }

    function plusSurface(width, height, scale) {
        const source = document.createElement('canvas');
        source.width = Math.ceil(width * scale);
        source.height = Math.ceil(height * scale);
        const ctx = source.getContext('2d');
        ctx.scale(scale, scale);
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#d2d2d7';
        ctx.fill();
        ctx.translate(width / 2, height / 2);
        ctx.scale(width / 36, height / 36);
        ctx.translate(-18, -18);
        ctx.fillStyle = '#1d1d1f';
        ctx.fill(new Path2D('m24 16.5h-4.5v-4.5c0-.8286-.6719-1.5-1.5-1.5s-1.5.6714-1.5 1.5v4.5h-4.5c-.8281 0-1.5.6714-1.5 1.5s.6719 1.5 1.5 1.5h4.5v4.5c0 .8286.6719 1.5 1.5 1.5s1.5-.6714 1.5-1.5v-4.5h4.5c.8281 0 1.5-.6714 1.5-1.5s-.6719-1.5-1.5-1.5z'));
        return source;
    }

    function buttonSurface(width, height, scale) {
        const source = document.createElement('canvas');
        source.width = Math.ceil(width * scale);
        source.height = Math.ceil(height * scale);
        const context = source.getContext('2d');
        if (!('letterSpacing' in context)) throw new Error('Text spacing unavailable');
        const css = getComputedStyle(navButton);
        const bounds = navButton.getBoundingClientRect();
        context.scale(scale, scale);
        context.beginPath();
        context.roundRect(0, 0, width, height, height / 2);
        context.fillStyle = css.backgroundColor;
        context.fill();
        context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        context.fontKerning = css.fontKerning;
        context.letterSpacing = css.letterSpacing;
        // The link is flex, so an inline probe would report its center rather
        // than the text baseline. Measure the real anonymous text item instead.
        const textNode = [...navButton.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const textBounds = range.getBoundingClientRect();
        const text = textNode.textContent.trim();
        const baseline = textBounds.top - bounds.top + context.measureText(text).fontBoundingBoxAscent;
        context.fillStyle = css.color;
        context.fillText(text, textBounds.left - bounds.left, baseline);
        return source;
    }

    async function initialize() {
        if (initializing) return initializing;
        if (device) return true;
        initializing = (async () => {
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
            if (!adapter) return false;
            device = await adapter.requestDevice();
            device.lost.then(dispose);
            device.addEventListener('uncapturederror', dispose);
            const shader = device.createShaderModule({ code: `
                @group(0) @binding(0) var source: texture_2d<f32>;
                fn encodeSRGB(linear: vec3f) -> vec3f {
                    return select(1.055 * pow(linear, vec3f(1.0 / 2.4)) - 0.055,
                        12.92 * linear, linear <= vec3f(0.0031308));
                }
                @vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
                    let points = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
                    return vec4f(points[i], 0, 1);
                }
                @fragment fn fragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
                    // sRGB texture decoding gives linear RGB before exposure.
                    let color = textureLoad(source, vec2i(p.xy), 0);
                    let exposure = 2.4;
                    // rgba16float has no automatic sRGB output encoding.
                    return vec4f(encodeSRGB(color.rgb * exposure) * color.a, color.a);
                }
            ` });
            pipeline = await device.createRenderPipelineAsync({
                layout: 'auto', vertex: { module: shader, entryPoint: 'vertex' },
                fragment: { module: shader, entryPoint: 'fragment', targets: [{ format: 'rgba16float' }] }
            });
            return true;
        })();
        return initializing;
    }

    // Inline the small, local card tree so SVG rasterization has no external
    // images, fonts, stylesheets, or network requests to resolve.
    async function snapshot(card, width, height, scale) {
        await document.fonts.ready;
        const images = [...card.querySelectorAll('img')];
        await Promise.all(images.map(image => image.decode()));
        const imageSources = await Promise.all(images.map(image => embedImage(image.currentSrc || image.src)));
        const clone = card.cloneNode(true);
        clone.querySelectorAll('.project-hdr-canvas').forEach(node => node.remove());
        const originals = [card, ...card.querySelectorAll(':not(.project-hdr-canvas)')];
        const copies = [clone, ...clone.querySelectorAll('*')];
        for (let index = 0; index < originals.length; index++) {
            const original = originals[index];
            const copy = copies[index];
            const css = getComputedStyle(original);
            copy.style.cssText = snapshotProperties.map(property => `${property}:${css.getPropertyValue(property)}`).join(';');
            copy.removeAttribute('id');
            if (original instanceof HTMLImageElement) {
                // Reuse the compressed JPEG, read asynchronously, with no
                // synchronous canvas encoding or multi-megabyte PNG expansion.
                copy.src = imageSources[images.indexOf(original)];
                copy.removeAttribute('srcset');
                copy.removeAttribute('loading');
            }
            if (index > 0 && index % 8 === 0) {
                if (globalThis.scheduler?.yield) await scheduler.yield();
                else await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        Object.assign(clone.style, {
            width: `${width}px`, height: `${height}px`, margin: '0',
            transform: 'none', translate: 'none', scale: 'none', opacity: '1',
            position: 'relative', left: 'auto', top: 'auto', boxShadow: 'none'
        });
        // Root classes are unnecessary after styles are inlined. This also
        // prevents captured HDR-active state from hiding anything in the SVG.
        clone.removeAttribute('class');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        const foreign = document.createElementNS(svg.namespaceURI, 'foreignObject');
        foreign.setAttribute('width', '100%');
        foreign.setAttribute('height', '100%');
        foreign.append(clone);
        svg.append(foreign);
        const image = new Image();
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
        await image.decode();
        const result = document.createElement('canvas');
        result.width = Math.ceil(width * scale);
        result.height = Math.ceil(height * scale);
        result.getContext('2d').drawImage(image, 0, 0, result.width, result.height);
        // Upload directly to the GPU. A getImageData security probe would force
        // the entire surface back to the CPU, even when reading one pixel.
        // copyExternalImageToTexture enforces origin security itself.
        return result;
    }

    async function imageSurface(state, width, height, scale) {
        const image = state.card.querySelector('.project-cover');
        await image.decode();
        const source = document.createElement('canvas');
        source.width = Math.ceil(width * scale);
        source.height = Math.ceil(height * scale);
        const ctx = source.getContext('2d');
        const ratio = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        const drawWidth = image.naturalWidth * ratio;
        const drawHeight = image.naturalHeight * ratio;
        const position = getComputedStyle(image).objectPosition.split(/\s+/);
        const fraction = value => value?.endsWith('%') ? parseFloat(value) / 100 : value === 'left' || value === 'top' ? 0 : value === 'right' || value === 'bottom' ? 1 : 0.5;
        ctx.scale(scale, scale);
        ctx.drawImage(image, (width - drawWidth) * fraction(position[0]), (height - drawHeight) * fraction(position[1]), drawWidth, drawHeight);
        return source;
    }

    async function prepare(state) {
        if (!desired(state)) return reset(state);
        if (state.pending) return;
        const surface = state.imageOnly ? state.card.querySelector('.project-image') : state.card;
        const bounds = surface.getBoundingClientRect();
        const width = bounds.width, height = bounds.height;
        const scale = Math.min(devicePixelRatio || 1, 2);
        const key = `${width}:${height}:${scale}`;
        if (state.key === key) {
            document.body.classList.add('projects-hdr-enabled');
            state.card.classList.add(activeClass(state));
            return;
        }
        // Capture the live card, never a card hidden by an active HDR layer.
        if (!state.navigation && !state.heading && !state.button) reset(state);
        state.pending = true;
        const generation = ++state.generation;
        try {
            if (!await initialize() || stopped || !eligible()) return;
            document.body.classList.add('projects-hdr-enabled');
            if (!state.navigation && !state.heading && !state.button) state.card.classList.add('project-hdr-ready');
            if (state.heading || state.button) await document.fonts.ready;
            const source = state.navigation ? navbarSurface(width, height, scale) :
                state.button ? buttonSurface(width, height, scale) :
                state.heading ? titleSurface(width, height, scale) :
                state.plus ? plusSurface(width, height, scale) :
                state.imageOnly ? await imageSurface(state, width, height, scale) :
                await snapshot(state.card, width, height, scale);
            if (stopped || generation !== state.generation) return;
            if (!state.canvas) {
                const canvas = document.createElement('canvas');
                canvas.className = state.navigation ? 'navbar-hdr-canvas' :
                    state.button ? 'navbar-button-hdr-canvas' :
                    state.heading ? 'projects-title-hdr-canvas' : state.plus ? 'plus-hdr-canvas' : state.imageOnly ? 'project-image-hdr-canvas' : 'project-hdr-canvas';
                canvas.setAttribute('aria-hidden', 'true');
                state.context = canvas.getContext('webgpu');
                if (!state.context) return dispose();
                state.context.configure({ device, format: 'rgba16float', colorSpace: 'srgb',
                    alphaMode: 'premultiplied', toneMapping: { mode: 'extended' } });
                if (state.context.getConfiguration?.().toneMapping?.mode !== 'extended') return dispose();
                state.canvas = canvas;
                surface.append(canvas);
            }
            state.canvas.width = source.width;
            state.canvas.height = source.height;
            state.texture?.destroy();
            state.texture = device.createTexture({
                size: [source.width, source.height], format: 'rgba8unorm-srgb',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
            });
            device.queue.copyExternalImageToTexture({ source }, { texture: state.texture }, [source.width, source.height]);
            const bindings = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: state.texture.createView() }] });
            const encoder = device.createCommandEncoder();
            const pass = encoder.beginRenderPass({ colorAttachments: [{
                view: state.context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store'
            }] });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindings);
            pass.draw(3);
            pass.end();
            device.queue.submit([encoder.finish()]);
            // Only the finished canvas is cached; the upload texture is no
            // longer needed by later hovers after these commands are submitted.
            state.texture.destroy();
            state.texture = null;
            state.key = key;
            if (desired(state)) {
                // Let the zero-opacity canvas enter layout before its fade-in.
                getComputedStyle(state.canvas).opacity;
                state.card.classList.add(activeClass(state));
            }
        } catch {
            // Snapshot security restrictions or unsupported GPU formats must
            // never affect the working project links or the original content.
            reset(state);
            state.card.classList.remove('project-hdr-ready');
            state.key = null;
        } finally {
            state.pending = false;
            if (generation !== state.generation && desired(state)) prepare(state);
        }
    }

    for (const state of states) {
        if (state.navigation || state.heading || state.button) continue;
        const hoverTarget = state.plus ? state.parentCard : state.card;
        hoverTarget.addEventListener('pointerenter', event => {
            if (event.pointerType !== 'mouse') return;
            state.hovered = true;
            prepare(state);
        });
        hoverTarget.addEventListener('pointerleave', () => {
            state.hovered = false;
            if (!desired(state)) reset(state);
        });
        state.card.addEventListener('focusin', () => prepare(state));
        state.card.addEventListener('focusout', () => queueMicrotask(() => {
            if (!desired(state)) reset(state);
        }));
    }
    function update() {
        if (!eligible()) {
            document.body.classList.remove('projects-hdr-enabled');
            states.forEach(reset);
        } else states.forEach(state => {
            if (desired(state)) prepare(state);
            else reset(state);
        });
    }
    if (navigation && navState) {
        new MutationObserver(() => {
            if (desired(navState)) prepare(navState);
            else reset(navState);
            if (buttonState) {
                if (desired(buttonState)) prepare(buttonState);
                else reset(buttonState);
            }
        }).observe(navigation, { attributes: true, attributeFilter: ['class', 'inert'] });
    }
    if (buttonState) {
        const refreshButton = () => {
            buttonState.key = null;
            if (desired(buttonState)) prepare(buttonState);
        };
        navButton.addEventListener('transitionend', event => {
            if (event.target === navButton && event.propertyName === 'background-color') refreshButton();
        });
        for (const event of ['pointerenter', 'pointerleave']) {
            navButton.addEventListener(event, () => requestAnimationFrame(refreshButton));
        }
    }
    if (titleState) {
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                titleState.visible = entries[0].isIntersecting;
                if (desired(titleState)) prepare(titleState);
                else reset(titleState);
            }).observe(title);
        } else {
            titleState.visible = true;
            if (desired(titleState)) prepare(titleState);
        }
        document.fonts.addEventListener('loadingdone', () => {
            titleState.key = null;
            if (desired(titleState)) prepare(titleState);
        });
    }
    const resize = new ResizeObserver(entries => {
        for (const entry of entries) {
            const state = states.find(item => item.card === entry.target);
            state.generation++;
            state.key = null;
            reset(state);
            if (desired(state)) prepare(state);
        }
    });
    states.forEach(state => resize.observe(state.card));
    [hdr, pointer, contrast].forEach(query => query.addEventListener('change', update));
    window.addEventListener('resize', () => {
        states.forEach(state => { state.key = null; });
        update();
    }, { passive: true });
    const projectDialog = document.querySelector('.project-modal');
    if (projectDialog) new MutationObserver(() => {
        if (!projectDialog.classList.contains('active')) return;
        states.forEach(state => {
            if (!state.navigation && !state.heading && !state.button) {
                state.hovered = false;
                reset(state);
            }
        });
    }).observe(projectDialog, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) states.forEach(state => { state.hovered = false; reset(state); });
        else update();
    });
})();
