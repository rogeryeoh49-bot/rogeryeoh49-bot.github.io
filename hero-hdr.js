/* Real HDR edge highlights over the original, unchanged DOM text colors.
   Linear intensity 3 is a signal level, not a promise of physical screen nits. */
(() => {
    const heading = document.querySelector('.hero-name h1');
    const hdr = matchMedia('(dynamic-range: high)');
    const contrast = matchMedia('(forced-colors: active)');
    if (!heading || !navigator.gpu || !isSecureContext) return;

    const lines = [...heading.children];
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-hdr-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const mask = document.createElement('canvas');
    const ink = mask.getContext('2d');
    // Without letterSpacing, the rasterized text would not match the DOM.
    if (!ink || !('letterSpacing' in ink)) return;
    let device, context, pipeline, texture, observer;
    let frame = 0, starting = false, stopped = false;
    const eligible = () => hdr.matches && !contrast.matches;
    const restore = () => {
        heading.classList.remove('hdr-active');
        canvas.hidden = true;
    };
    function stop() {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(frame);
        observer?.disconnect();
        window.removeEventListener('resize', schedule);
        document.fonts.removeEventListener('loadingdone', schedule);
        hdr.removeEventListener('change', update);
        contrast.removeEventListener('change', update);
        restore();
        canvas.remove();
        texture?.destroy();
        context?.unconfigure();
        device?.destroy();
    }

    function render() {
        frame = 0;
        if (stopped || !device || !eligible()) return restore();
        try {
            const bounds = heading.getBoundingClientRect();
            const padding = 32; // Includes italic overhang and font ascenders.
            const scale = Math.min(devicePixelRatio || 1, 3);
            const width = Math.ceil((bounds.width + padding * 2) * scale);
            const height = Math.ceil((bounds.height + padding * 2) * scale);
            if (!bounds.width || !bounds.height) return restore();
            mask.width = canvas.width = width;
            mask.height = canvas.height = height;
            Object.assign(canvas.style, {
                left: `${-padding}px`, top: `${-padding}px`,
                width: `${width / scale}px`, height: `${height / scale}px`
            });
            ink.scale(scale, scale);
            ink.fillStyle = '#fff';
            ink.textBaseline = 'alphabetic';
            for (const line of lines) {
                const css = getComputedStyle(line);
                const text = line.textContent;
                // A zero-height inline box locates the browser's real baseline.
                const probe = document.createElement('i');
                probe.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline';
                line.append(probe);
                const baseline = probe.getBoundingClientRect().top;
                const rect = line.getBoundingClientRect();
                probe.remove();
                ink.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
                ink.fontKerning = css.fontKerning;
                ink.letterSpacing = css.letterSpacing;
                ink.fillText(text, rect.left - bounds.left + padding, baseline - bounds.top + padding);
            }
            texture?.destroy();
            texture = device.createTexture({
                size: [width, height], format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
            });
            device.queue.copyExternalImageToTexture({ source: mask }, { texture }, [width, height]);
            const bindings = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [{ binding: 0, resource: texture.createView() }]
            });
            const commands = device.createCommandEncoder();
            const pass = commands.beginRenderPass({ colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store'
            }] });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindings);
            pass.draw(3);
            pass.end();
            device.queue.submit([commands.finish()]);
            canvas.hidden = false;
            heading.classList.add('hdr-active');
        } catch {
            stop();
        }
    }
    function schedule() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(render);
    }
    async function start() {
        if (starting || stopped || !eligible()) return;
        if (device) return schedule();
        starting = true;
        try {
            await document.fonts.ready;
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
            if (!adapter) return;
            device = await adapter.requestDevice();
            device.lost.then(stop);
            device.addEventListener('uncapturederror', stop);
            context = canvas.getContext('webgpu');
            if (!context) return stop();
            context.configure({ device, format: 'rgba16float', alphaMode: 'premultiplied',
                colorSpace: 'srgb', toneMapping: { mode: 'extended' } });
            // Older implementations may silently ignore the toneMapping option.
            if (context.getConfiguration?.().toneMapping?.mode !== 'extended') return stop();
            const shader = device.createShaderModule({ code: `
                @group(0) @binding(0) var mask: texture_2d<f32>;
                @vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
                    let positions = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
                    return vec4f(positions[i], 0, 1);
                }
                @fragment fn fragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
                    let pixel = vec2i(p.xy);
                    let alpha = textureLoad(mask, pixel, 0).a;
                    let above = textureLoad(mask, pixel - vec2i(0, 1), 0).a;
                    // Only the upper one-pixel contour catches the light.
                    // The interior stays transparent so the original colors show.
                    let edge = max(alpha - above, 0.0);
                    return vec4f(vec3f(3.0, 2.76, 2.46) * edge, edge);
                }
            ` });
            pipeline = await device.createRenderPipelineAsync({
                layout: 'auto', vertex: { module: shader, entryPoint: 'vertex' },
                fragment: { module: shader, entryPoint: 'fragment', targets: [{ format: 'rgba16float' }] }
            });
            heading.append(canvas);
            observer = new ResizeObserver(schedule);
            observer.observe(heading);
            window.addEventListener('resize', schedule, { passive: true });
            document.fonts.addEventListener('loadingdone', schedule);
            render();
        } catch {
            stop();
        } finally {
            starting = false;
        }
    }
    function update() {
        if (eligible()) start();
        else restore();
    }
    hdr.addEventListener('change', update);
    contrast.addEventListener('change', update);
    start();
})();
