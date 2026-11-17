/* =========================================================
PROJECT DATA
========================================================= */

const projects = {

    project1: {
        "category": "SOFTWARE / MUSIC",
        "title": "LINERNOTES",
        "description": "An app for looking more closely at the music I listen to. Samples, production details, and the songs behind a song.",
        "longDescription": [
            "I like knowing what I am hearing. A sample, a production detail, or a connection to another song can send me looking for more. LinerNotes gives those details a place alongside the music.",
            "On a track page, the song sits with its samples and background information. I want to keep listening while following those connections, without having to piece everything together across separate pages.",
            "Ariana Grande’s “goodnight n go,” for example, connects to Imogen Heap’s “Goodnight and Go.” Being able to see that connection and play the source is the kind of detail I want the app to make easy to explore."
        ],
        "process": [
            "I care about how the app feels to use, so I spend time adjusting the SwiftUI interface as well as getting the data to appear where it should. The interface, APIs, and cloud database all have to work together.",
            "I am proud of LinerNotes. I also get annoyed with it when something refuses to run properly. Fixing those problems keeps pulling me further into the code and the way the different parts depend on each other. I want to understand what went wrong."
        ],
        "technologyLabel": "TECHNOLOGY",
        "technologies": [
            "SwiftUI",
            "APIs",
            "Cloud database"
        ]
    },

    project2: {
        "category": "ARTIFICIAL INTELLIGENCE",
        "title": "MINIMAX AI",
        "description": "A graphical Tic-Tac-Toe game with an AI that searches the possible moves before choosing its own. You can draw against it. Winning is another matter.",
        "longDescription": [
            "I built this project during a one-week AI summer school at Fitzwilliam College in Cambridge. Tic-Tac-Toe gave me a small board on which to work with recursive decision-making and game-tree search.",
            "For each possible move, the AI explores the moves that could follow until it reaches a win, a loss, or a draw. Minimax works back through those outcomes, choosing on the assumption that the other player will also make their best move.",
            "That gives the game a fairly stubborn opponent: with correct play, the AI cannot lose. The graphical board puts the algorithm into a game I can actually play and test."
        ],
        "process": [
            "The project brings together the search algorithm and a graphical interface. A move on the board becomes a new position for the AI to evaluate, and its chosen move comes back to the board.",
            "The small size of the game makes it possible to trace a decision all the way through. If a move looks wrong, I can go back through the possible positions and check how the result was chosen. That is the part I find interesting: being able to follow the reasoning behind a move."
        ],
        "technologyLabel": "ALGORITHM",
        "technologies": [
            "Minimax",
            "Recursive search",
            "Game trees"
        ]
    },

    project3: {
        "category": "SOFTWARE / BLUETOOTH",
        "title": "BLUETOOTH SONAR",
        "description": "A Bluetooth tracker with a sonar-style display. Watch the signal change, and listen for the beeps to get faster as you move closer.",
        "longDescription": [
            "I made Bluetooth Sonar to experiment with Bluetooth signal tracking and visualization. Nearby devices appear as targets on a sonar-style display. I can select one to track, watch its signal strength change, and use the estimated distance and audio feedback to help find it.",
            "I tested it with an AirPods charging case. Honestly, it worked better than I expected. The beeps speed up as the signal gets stronger, so I can follow them without constantly looking at the screen. Bluetooth signal strength is imperfect, though. The distance is an estimate, not an exact measurement."
        ],
        "technologyLabel": "TECHNOLOGY",
        "technologies": ["Python", "Tkinter", "Bleak / BLE", "RSSI", "NumPy", "sounddevice"]
    },

    project4: {
        category: "WRITING / ESSAYS",
        title: "ESSAYS",
        description: "Two papers on artificial intelligence: how a game makes decisions, and how the data behind AI should be protected.",
        longDescription: "My published summer-school paper on Minimax and my EPQ on AI data protection in China.",
        technologyLabel: "FORMAT",
        technologies: ["Essays"]
    },

    project5: {
        category: "EXPERIMENTAL / CREATIVE",
        title: "PROJECT FIVE",
        description:
            "An experimental project combining technology and creativity.",
        longDescription:
            "Project information will be added here later."
    },

    project6: {
        category: "PHILOSOPHY / HUMAN × AI",
        title: "BETWEEN US",
        description:
            "An exploration of consciousness, emotional connection, and the space between human and artificial intelligence.",
        longDescription:
            "A personal inquiry shaped by my ongoing conversations with ChatGPT."
    }

};


/* Project dialog: keyboard access, isolated background, restored focus. */
const projectCards = document.querySelectorAll(".project-card");
const projectModal = document.getElementById("projectModal");
const modalClose = document.getElementById("modalClose");
const modalScroll = document.querySelector(".modal-scroll");
const linerFrame = document.getElementById("linernotes-modal-frame");
const essayDetails = document.getElementById("modalEssayDetails");
const betweenDetails = document.getElementById("modalBetweenDetails");
const standardProjectContent = [...document.querySelectorAll("[data-standard-project-content]")];
essayDetails.append(document.getElementById("essayDetailsTemplate").content.cloneNode(true));
const background = [...document.querySelectorAll(".page, .navbar, .skip-link")];
let returnFocus = null;
let previousOverflow = "";

function renderParagraphs(container, paragraphs) {
    const entries = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
    container.replaceChildren(...entries.map(text => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        return paragraph;
    }));
}

// Keep the featured summaries aligned with their project details.
document.querySelectorAll("[data-feature-project]").forEach(slide => {
    const project = projects[slide.dataset.featureProject];
    if (!project) return;
    slide.querySelector(".feature-kicker").textContent = project.category.replace(/(?:SOFTWARE\s*\/\s*|\s*\/\s*SOFTWARE)/i, "");
    slide.querySelector("h3").textContent = project.title;
    slide.querySelector(".feature-description").textContent = project.description;
});

function closeModal() {
    if (!projectModal.classList.contains("active")) return;
    projectModal.classList.remove("active");
    linerFrameGeneration++;
    linerFrame.removeAttribute("src");
    linerFrame.hidden = true;
    modalScroll.hidden = false;
    projectModal.setAttribute("aria-hidden", "true");
    projectModal.inert = true;
    document.body.style.overflow = previousOverflow;
    background.forEach(element => { element.inert = false; });
    updateNavVisibility();
    returnFocus?.focus({ preventScroll: true });
}

// Prefetch the LinerNotes page and assets without creating a video player.
const linerCard = document.querySelector('.project-card[data-project="project1"]');
let linerPreloadStarted = false;
let linerVideoPreload = null;
let linerFrameGeneration = 0;
function preloadLinerNotes() {
    if (linerPreloadStarted) return;
    linerPreloadStarted = true;
    const assets = [
        '/projects/linernotes.html', '/projects/linernotes.html?embedded=1',
        '/style.css', '/fancy.css', '/between-us.css', '/glass.css',
        '/project-page.css?v=project-nav-3', '/glass.js', '/project-nav.js',
        '/linernotes-video.js?v=preload-1', '/assets/images/linernotes-mocksnap.jpg'
    ];
    for (const url of assets) {
        fetch(url, { credentials: 'same-origin', priority: 'low' })
            .then(response => { if (response.ok) return response.blob(); })
            .catch(() => {});
    }
    linerVideoPreload = fetch('/assets/videos/linernotes-demo.mp4', { credentials: 'same-origin' })
        .then(response => {
            if (!response.ok) throw new Error('Video preload failed');
            return response.blob();
        }).then(blob => URL.createObjectURL(blob)).catch(() => null);
}
linerCard?.addEventListener('pointerenter', preloadLinerNotes, { once: true });
linerCard?.addEventListener('focusin', preloadLinerNotes, { once: true });

projectCards.forEach(card => {
    const projectLink = card.querySelector(".project-open");
    const previewLink = card.querySelector(".project-plus");
    previewLink.setAttribute("aria-haspopup", "dialog");
    previewLink.setAttribute("aria-controls", "projectModal");
    previewLink.addEventListener("click", event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const project = projects[card.dataset.project];
        if (!project) return;
        event.preventDefault();
        returnFocus = event.currentTarget;
        document.getElementById("modalCategory").textContent = project.category;
        document.getElementById("modalTitle").textContent = project.title;
        document.getElementById("modalDescription").textContent = project.description;
        renderParagraphs(document.getElementById("modalLongDescription"), project.longDescription);
        const isLinerNotes = card.dataset.project === "project1";
        projectModal.classList.toggle("is-linernotes-modal", isLinerNotes);
        linerFrame.hidden = !isLinerNotes;
        modalScroll.hidden = isLinerNotes;
        if (isLinerNotes) {
            preloadLinerNotes();
            const generation = ++linerFrameGeneration;
            linerFrame.addEventListener('load', () => {
                linerVideoPreload?.then(url => {
                    if (url && generation === linerFrameGeneration && projectModal.classList.contains('active')) {
                        linerFrame.contentWindow?.postMessage({ type: 'linernotes-video-preloaded', url }, window.location.origin);
                    }
                });
            }, { once: true });
            linerFrame.src = "/projects/linernotes.html?embedded=1";
        }
        const isEssay = card.dataset.project === "project4";
        const isBetween = card.dataset.project === "project6";
        projectModal.classList.toggle("is-between", isBetween);
        betweenDetails.hidden = !isBetween;
        essayDetails.hidden = !isEssay;
        standardProjectContent.forEach(element => { element.hidden = isEssay || isBetween; });
        const processSection = document.getElementById("modalProcessSection");
        processSection.hidden = isEssay || isBetween || !project.process;
        renderParagraphs(document.getElementById("modalProcess"), project.process || []);
        document.getElementById("modalTechnologyLabel").textContent = project.technologyLabel || "TECHNOLOGY";
        document.getElementById("modalTechnologies").textContent = project.technologies?.join(" / ") || "Details to be added.";
        previousOverflow = document.body.style.overflow;
        projectModal.inert = false;
        projectModal.setAttribute("aria-hidden", "false");
        projectModal.classList.add("active");
        modalScroll.scrollTop = 0;
        document.body.style.overflow = "hidden";
        modalClose.focus({ preventScroll: true });
        background.forEach(element => { element.inert = true; });
    });
});
window.addEventListener("message", event => {
    if (event.origin === window.location.origin && event.source === linerFrame.contentWindow && event.data === "linernotes-close") closeModal();
});
modalClose.addEventListener("click", closeModal);
document.querySelector(".modal-backdrop").addEventListener("click", closeModal);
projectModal.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...projectModal.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getClientRects().length && !element.closest("[hidden], [inert]"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
    }
});

/* Preserve native scrolling while swapping navigation. */
const originalNav = document.querySelector(".navbar-original");
const floatingNav = document.querySelector(".navbar-floating");
const aboutSection = document.querySelector("#about");
let previousNavFloating = null;
let previousNavModal = null;
function updateNavVisibility() {
    const floating = aboutSection && aboutSection.getBoundingClientRect().top <= 200;
    const modalOpen = projectModal.classList.contains("active");
    if (floating === previousNavFloating && modalOpen === previousNavModal) return;
    previousNavFloating = floating;
    previousNavModal = modalOpen;
    originalNav.classList.toggle("hidden", floating);
    originalNav.setAttribute("aria-hidden", String(floating));
    originalNav.inert = floating || modalOpen;
    floatingNav.classList.toggle("show", floating);
    floatingNav.setAttribute("aria-hidden", String(!floating));
    floatingNav.inert = !floating || modalOpen;
}
updateNavVisibility();
window.addEventListener("scroll", updateNavVisibility, { passive: true });
window.addEventListener("resize", updateNavVisibility, { passive: true });

/* Featured work: scoped keyboard controls and native vertical touch scrolling. */
const featureCarousel = document.querySelector("[data-carousel]");
if (featureCarousel) {
    const featureGallery = featureCarousel.closest('.feature-gallery');
    const track = featureCarousel.querySelector(".feature-track");
    const slides = [...featureCarousel.querySelectorAll(".feature-slide")];
    const indicator = featureGallery.querySelector(".dotnav-items");
    const toggleButton = featureGallery.querySelector(".play-pause-button");
    const controls = featureGallery.querySelector(".aap-media-card-gallery");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeIndex = 0;
    const slideDuration = 5000;
    let autoplayTimer = null;
    let elapsed = 0;
    let startedAt = null;
    let autoPlayEnabled = !reducedMotion.matches;
    let currentTranslate = 0;
    let drag = null;
    let suppressLinkClick = false;
    let resumeRequested = false;
    let carouselVisible = false;

    // Clamp the overlay to the visible viewport and to the gallery bounds.
    // The carousel clips horizontal slides, so sticky positioning inside it
    // would attach to that clipping container instead of the page viewport.
    let overlayFrame = 0;
    const positionControls = () => {
        overlayFrame = 0;
        const gallery = featureGallery.getBoundingClientRect();
        const gap = matchMedia('(max-width: 734px)').matches ? 20 : 32;
        const height = controls.offsetHeight;
        const bottomLimit = Math.max(0, gallery.height - height - gap);
        const viewportPosition = innerHeight - gap - height - gallery.top;
        controls.style.setProperty('--featured-controls-top', `${Math.max(0, Math.min(bottomLimit, viewportPosition))}px`);
    };
    const scheduleControlsPosition = () => {
        if (!overlayFrame) overlayFrame = requestAnimationFrame(positionControls);
    };
    positionControls();
    window.addEventListener('scroll', scheduleControlsPosition, { passive: true });
    window.addEventListener('resize', scheduleControlsPosition, { passive: true });
    new ResizeObserver(scheduleControlsPosition).observe(featureGallery);

    // The entrance is separate from the autoplay clock and only runs once
    // per page load. Keep controls available without JS or reduced motion.
    if (!reducedMotion.matches && 'IntersectionObserver' in window) {
        controls.classList.add('intro-pending');
        let waitingForCarousel = false;
        const carouselRevealObserver = new MutationObserver(() => {
            if (waitingForCarousel && !featureCarousel.classList.contains('motion-waiting') && !featureCarousel.classList.contains('motion-playing')) {
                waitingForCarousel = false;
                revealControls();
            }
        });
        const revealControls = () => {
            if (!controls.classList.contains('intro-pending')) return;
            // The parent itself fades in; start only after that fade finishes,
            // otherwise the seed bubble is nearly invisible during its entrance.
            if (featureCarousel.classList.contains('motion-waiting') || featureCarousel.classList.contains('motion-playing')) {
                waitingForCarousel = true;
                carouselRevealObserver.observe(featureCarousel, { attributes: true, attributeFilter: ['class'] });
                return;
            }
            carouselRevealObserver.disconnect();
            // Both bubbles start at the center of the complete control group.
            positionControls();
            const bounds = controls.getBoundingClientRect();
            controls.style.setProperty('--intro-rise-distance', `${Math.max(0, window.innerHeight - bounds.top + 20)}px`);
            controls.querySelectorAll('.all-access-pass__element').forEach(element => {
                const bubble = element.getBoundingClientRect();
                element.style.setProperty('--intro-center-offset', `${bounds.left + bounds.width / 2 - (bubble.left + bubble.width / 2)}px`);
            });
            controls.classList.remove('intro-pending');
            controls.classList.add('intro-entering');
            introObserver.disconnect();
        };
        controls.addEventListener('animationend', event => {
            if (event.target === controls && event.animationName === 'featured-rise') controls.classList.remove('intro-entering');
        });
        const introObserver = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) revealControls();
        }, { threshold: 0.1 });
        // The controls sit near the viewport bottom, so observe the gallery
        // rather than waiting for the controls to enter an inset viewport.
        introObserver.observe(featureCarousel);
        controls.addEventListener('focusin', revealControls, { once: true });
        reducedMotion.addEventListener('change', () => {
            if (reducedMotion.matches && controls.classList.contains('intro-pending')) {
                controls.classList.remove('intro-pending');
                introObserver.disconnect();
                carouselRevealObserver.disconnect();
            }
        });
    }

    // Local adapter for Apple's original markup/CSS. No Apple framework or
    // analytics is initialized. The ::after CSSAnimation runs natively and is
    // synchronized on state changes, sharing the carousel's pause/resume clock.
    controls.style.setProperty("--animation-duration", `${slideDuration}ms`);
    const dots = [...indicator.querySelectorAll(".dotnav-link")];
    dots.forEach((dot, index) => {
        const slide = slides[index];
        slide.id = `featured-slide-${index + 1}`;
        dot.setAttribute("aria-controls", slide.id);
        dot.addEventListener("click", event => {
            event.preventDefault();
            if (event.detail > 0) dot.blur();
            updateCarousel(index);
            syncAutoplay();
        });
    });

    let motionFrame = null;
    let programmaticScroll = false;
    let scrollSettleTimer = null;
    const easeInOutQuad = e => e < .5 ? 2 * e * e : (4 - 2 * e) * e - 1;
    const transitionDuration = 1000 * (parseFloat(getComputedStyle(featureCarousel).getPropertyValue("--shared-media-gallery-transition-duration")) || 1);

    function centerOffset(slide) {
        return slide.offsetLeft + slide.offsetWidth / 2 - featureCarousel.clientWidth / 2;
    }
    function updateSpacing() {
        const edge = Math.max(0, (featureCarousel.clientWidth - slides[0].offsetWidth) / 2);
        track.style.paddingInline = `${edge}px`;
    }
    function syncDotnavPosition() {
        const first = centerOffset(slides[0]);
        const step = slides.length > 1 ? centerOffset(slides[1]) - first : 1;
        controls.style.setProperty("--autoplay-progress", Math.max(0, Math.min(slides.length - 1, (featureCarousel.scrollLeft - first) / step)));
    }
    function cancelCarouselMotion() {
        cancelAnimationFrame(motionFrame);
        motionFrame = null;
        programmaticScroll = false;
        featureCarousel.style.scrollSnapType = "";
    }
    function applyTransform(translateX, animate = true) {
        cancelCarouselMotion();
        const target = -translateX;
        const from = featureCarousel.scrollLeft;
        if (!animate || reducedMotion.matches || Math.abs(from - target) < 1) {
            programmaticScroll = true;
            featureCarousel.scrollLeft = target;
            syncDotnavPosition();
            requestAnimationFrame(() => { programmaticScroll = false; });
            return;
        }
        programmaticScroll = true;
        featureCarousel.style.scrollSnapType = "none";
        const started = performance.now();
        const step = now => {
            const progress = Math.min(1, (now - started) / transitionDuration);
            featureCarousel.scrollLeft = from + (target - from) * easeInOutQuad(progress);
            syncDotnavPosition();
            if (progress < 1) motionFrame = requestAnimationFrame(step);
            else {
                motionFrame = null;
                featureCarousel.style.scrollSnapType = "";
                requestAnimationFrame(() => { programmaticScroll = false; });
            }
        };
        motionFrame = requestAnimationFrame(step);
    }

    function updateCarousel(nextIndex, animate = true, resetProgress = true, fromScroll = false) {
        if (resetProgress) {
            stopClock();
            elapsed = 0;
        }
        activeIndex = (nextIndex + slides.length) % slides.length;
        const activeSlide = slides[activeIndex];
        // offsetWidth is independent of the inactive slide's scale transform.
        currentTranslate = featureCarousel.clientWidth / 2 - (activeSlide.offsetLeft + activeSlide.offsetWidth / 2);
        if (!fromScroll) applyTransform(currentTranslate, animate);
        slides.forEach((slide, index) => {
            const active = index === activeIndex;
            slide.classList.toggle("is-active", active);
            slide.setAttribute("aria-hidden", String(!active));
            slide.inert = !active;
            dots[index].classList.toggle("current", active);
            dots[index].parentElement.classList.toggle("current", active);
            dots[index].setAttribute("aria-selected", String(active));
            dots[index].tabIndex = active ? 0 : -1;
        });
        renderProgress();
    }

    function renderProgress() {
        const played = elapsed + (startedAt === null ? 0 : performance.now() - startedAt);
        for (const animation of dots[activeIndex].getAnimations({ subtree: true })) {
            if (animation.animationName !== "aap-animate-progress") continue;
            animation.currentTime = Math.min(slideDuration, played);
            if (startedAt === null) animation.pause();
            else animation.play();
        }
    }

    function stopClock() {
        if (startedAt !== null) {
            elapsed = Math.min(slideDuration, elapsed + performance.now() - startedAt);
            startedAt = null;
        }
        clearTimeout(autoplayTimer);
        autoplayTimer = null;
        renderProgress();
    }

    function syncAutoplay() {
        stopClock();
        controls.classList.toggle("playing", autoPlayEnabled);
        controls.classList.toggle("paused", !autoPlayEnabled);
        toggleButton.setAttribute("aria-label", autoPlayEnabled ? "Pause autoplay" : "Resume autoplay");
        const hasFocus = featureGallery.contains(document.activeElement);
        // An explicit Resume must work while focus remains on its button.
        const focusPauses = hasFocus && !(resumeRequested && document.activeElement === toggleButton);
        if (autoPlayEnabled && carouselVisible && !document.hidden && !focusPauses && !drag && !projectModal.classList.contains("active")) {
            startedAt = performance.now();
            // Both the fill and the slide deadline use this same five-second clock.
            autoplayTimer = window.setTimeout(() => {
                elapsed = slideDuration;
                startedAt = null;
                renderProgress();
                updateCarousel(activeIndex + 1);
                syncAutoplay();
            }, Math.max(0, slideDuration - elapsed));
        }
        renderProgress();
    }

    toggleButton.addEventListener("click", () => {
        autoPlayEnabled = !autoPlayEnabled;
        resumeRequested = autoPlayEnabled;
        syncAutoplay();
    });
    featureGallery.addEventListener("keydown", event => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        updateCarousel(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
        if (event.target.closest(".dotnav-link")) dots[activeIndex].focus();
        syncAutoplay();
    });
    function pauseAutoplayForGesture() {
        if (!autoPlayEnabled) return;
        autoPlayEnabled = false;
        resumeRequested = false;
        syncAutoplay();
    }
    // Native horizontal scrolling and CSS scroll snap handle trackpad and touch
    // gestures. As on Apple's gallery, the nearest card becomes current.
    featureCarousel.addEventListener("wheel", event => {
        if (event.ctrlKey || Math.abs(event.deltaX) < 1 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        if (motionFrame) cancelCarouselMotion();
        pauseAutoplayForGesture();
    }, { passive: true });
    featureCarousel.addEventListener("touchstart", () => {
        if (motionFrame) cancelCarouselMotion();
    }, { passive: true });
    featureCarousel.addEventListener("touchmove", () => {
        if (Math.abs(featureCarousel.scrollLeft + currentTranslate) > 2) pauseAutoplayForGesture();
    }, { passive: true });
    featureCarousel.addEventListener("scroll", () => {
        syncDotnavPosition();
        if (programmaticScroll) return;
        pauseAutoplayForGesture();
        clearTimeout(scrollSettleTimer);
        scrollSettleTimer = setTimeout(() => {
            const index = slides.reduce((best, slide, i) =>
                Math.abs(centerOffset(slide) - featureCarousel.scrollLeft) < Math.abs(centerOffset(slides[best]) - featureCarousel.scrollLeft) ? i : best, 0);
            if (index !== activeIndex) {
                updateCarousel(index, false, true, true);
                syncAutoplay();
            }
        }, 200);
    }, { passive: true });
    featureGallery.addEventListener("focusin", event => {
        if (event.target !== toggleButton) resumeRequested = false;
        syncAutoplay();
    });
    featureGallery.addEventListener("focusout", () => queueMicrotask(syncAutoplay));
    document.addEventListener("visibilitychange", syncAutoplay);
    modalClose.addEventListener("click", syncAutoplay);
    // Observe all dialog open/close paths, including Escape and backdrop clicks.
    new MutationObserver(syncAutoplay).observe(projectModal, { attributes: true, attributeFilter: ["class"] });
    reducedMotion.addEventListener("change", () => {
        autoPlayEnabled = !reducedMotion.matches;
        resumeRequested = false;
        updateCarousel(activeIndex, false, false);
        syncAutoplay();
    });
    window.addEventListener("resize", () => { updateSpacing(); updateCarousel(activeIndex, false, false); });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            const visible = entries[0].isIntersecting;
            if (visible === carouselVisible) return;
            carouselVisible = visible;
            syncAutoplay();
        }).observe(featureCarousel);
    } else carouselVisible = true;
    updateSpacing();
    updateCarousel(0, false);
    syncAutoplay();
}
