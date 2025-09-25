// ============================================================================
// HIFI DOCS HOMEPAGE ANIMATIONS
// ============================================================================
// This file contains two main animations:
// 1. Flowing Light Animation - Interactive particle system with mouse tracking
// 2. Typewriter Animation - Types out "HIFI DOCS" repeatedly with pauses
// ============================================================================

// ============================================================================
// GLOBAL CONFIGURATION CONSTANTS
// ============================================================================
// All animation configurations are defined as global constants for easy access
// and modification from anywhere in the application
// ============================================================================

// Flowing Light Animation Configuration
const FLOWING_LIGHT_CONFIG = {
  GRID_SIZE: 25, // logical spacing between dots (px)
  DOT_SIZE: 1, // radius of each dot (px)
  OPACITY_BASE: 0.02, // baseline opacity
  OPACITY_SCALE: 0.5, // how much intensity boosts opacity
  PROX_RADIUS: 150, // px for proximity boost
  RESIZE_DEBOUNCE_MS: 150, // debounce time for resize events
  MAX_RETRIES: 20, // maximum retry attempts for element detection
};

// Typewriter Animation Configuration
const TYPEWRITER_CONFIG = {
  text: "HIFI DOCS",
  typeSpeed: 150, // milliseconds between each character (2s total for 10 chars)
  pauseDuration: 5000, // milliseconds to pause after completing the text
  deleteSpeed: 50, // milliseconds between each character deletion
  deletePause: 500, // milliseconds to pause before starting deletion
  loop: true, // whether to continuously loop the animation
};

(function () {
  // ============================================================================
  // SECTION 1: FLOWING LIGHT ANIMATION VARIABLES
  // ============================================================================
  // Variables and state management for the flowing light animation
  // ============================================================================

  let retryCount = 0;

  let typewriterInterval = null;
  let typewriterElement = null;
  let isTyping = false;
  let isDeleting = false;
  let currentText = "";
  let currentIndex = 0;

  // ============================================================================
  // SECTION 3: TYPEWRITER ANIMATION FUNCTIONS
  // ============================================================================
  // Core functions that handle the typewriter effect logic
  // ============================================================================

  function startTypewriterAnimation() {
    typewriterElement = document.querySelector(".hero-title");
    if (!typewriterElement) {
      // Retry if element not found
      setTimeout(startTypewriterAnimation, 100);
      return;
    }

    // Prevent multiple animations from running simultaneously
    if (typewriterInterval) {
      return; // Animation already running, don't start another
    }

    // Reset state
    currentText = "";
    currentIndex = 0;
    isTyping = true;
    isDeleting = false;

    // Start the typing animation
    typewriterInterval = setInterval(
      typewriterTick,
      TYPEWRITER_CONFIG.typeSpeed
    );
  }

  function typewriterTick() {
    if (isTyping) {
      // Typing phase
      if (currentIndex < TYPEWRITER_CONFIG.text.length) {
        currentText += TYPEWRITER_CONFIG.text[currentIndex];
        currentIndex++;
        typewriterElement.textContent = currentText;
      } else {
        // Finished typing, start pause
        isTyping = false;
        clearInterval(typewriterInterval);
        typewriterInterval = null;
        setTimeout(() => {
          isDeleting = true;
          typewriterInterval = setInterval(
            typewriterTick,
            TYPEWRITER_CONFIG.deleteSpeed
          );
        }, TYPEWRITER_CONFIG.pauseDuration);
      }
    } else if (isDeleting) {
      // Deleting phase
      if (currentText.length > 0) {
        currentText = currentText.slice(0, -1);
        typewriterElement.textContent = currentText;
      } else {
        // Finished deleting, start pause before next cycle
        isDeleting = false;
        clearInterval(typewriterInterval);
        typewriterInterval = null;
        setTimeout(() => {
          if (TYPEWRITER_CONFIG.loop) {
            currentIndex = 0;
            isTyping = true;
            typewriterInterval = setInterval(
              typewriterTick,
              TYPEWRITER_CONFIG.typeSpeed
            );
          }
        }, TYPEWRITER_CONFIG.deletePause);
      }
    }
  }

  function stopTypewriterAnimation() {
    if (typewriterInterval) {
      clearInterval(typewriterInterval);
      typewriterInterval = null;
    }
    // Reset to original text
    if (typewriterElement) {
      typewriterElement.textContent = TYPEWRITER_CONFIG.text;
    }
  }

  // ============================================================================
  // SECTION 4: FLOWING LIGHT ANIMATION FUNCTIONS
  // ============================================================================
  // Core functions that handle the interactive particle system
  // ============================================================================

  function startAnimation() {
    const container = document.getElementById("flowing-light-container");
    if (!container) {
      if (retryCount < FLOWING_LIGHT_CONFIG.MAX_RETRIES) {
        retryCount++;
        // More aggressive retry with exponential backoff
        setTimeout(startAnimation, Math.min(50 * retryCount, 500));
      }
      return;
    }

    // Reset retry count on successful start
    retryCount = 0;

    // Clean up any previous run
    if (container._flowingLightCleanup) {
      container._flowingLightCleanup();
    }

    // Create and attach canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });
    container.appendChild(canvas);

    let width = 0,
      height = 0,
      dpr = 1;
    let cols = 0,
      rows = 0;
    let dots = new Float32Array(0); // [x0,y0, x1,y1, ...] logical positions
    let mouseX = 0,
      mouseY = 0;
    let time = 0;
    let rafId = 0;
    let running = true;

    function resize() {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width | 0);
      height = Math.max(1, rect.height | 0);
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 1;

      cols = Math.ceil(width / FLOWING_LIGHT_CONFIG.GRID_SIZE);
      rows = Math.ceil(height / FLOWING_LIGHT_CONFIG.GRID_SIZE);

      dots = new Float32Array(cols * rows * 2);
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots[i++] = c * FLOWING_LIGHT_CONFIG.GRID_SIZE;
          dots[i++] = r * FLOWING_LIGHT_CONFIG.GRID_SIZE;
        }
      }
    }

    // Debounced resize
    let resizeTimer = 0;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cancelAnimationFrame(rafId);
        resize();
        if (running) rafId = requestAnimationFrame(tick);
      }, FLOWING_LIGHT_CONFIG.RESIZE_DEBOUNCE_MS);
    }

    // Lightweight mouse tracker (no heavy work here)
    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }

    function tick(ts) {
      if (!running) return;
      time += 0.01;

      ctx.clearRect(0, 0, width, height);

      // One path for all circles is slower when many arcs overlap;
      // drawing directly per dot is typically faster for tiny dots.
      const proxInv = 1 / FLOWING_LIGHT_CONFIG.PROX_RADIUS;

      // Draw dots
      for (let i = 0; i < dots.length; i += 2) {
        const x0 = dots[i];
        const y0 = dots[i + 1];

        const dx = mouseX - x0;
        const dy = mouseY - y0;
        const dist = Math.hypot(dx, dy); // fast, avoids manual sqrt

        // Multi-wave intensity (mirrors your original)
        const w1 = Math.sin(time * 0.8 - dist * 0.005) * 0.5 + 0.5;
        const w2 =
          Math.sin(time * 0.6 - dist * 0.004 + Math.PI / 3) * 0.5 + 0.5;
        const w3 =
          Math.sin(time * 0.7 - dist * 0.006 + Math.PI / 6) * 0.5 + 0.5;
        const intensity = (w1 + w2 + w3) / 3;

        // Proximity boost
        const proxBoost = Math.max(0, 1 - dist * proxInv) * 0.4;
        const finalIntensity = Math.min(1, intensity + proxBoost);

        // Offset (tiny shimmer influenced by cursor direction)
        const dirX = dx / Math.max(1, width);
        const dirY = dy / Math.max(1, height);
        const offsetX = Math.sin(time * 0.6 - dist * 0.005) * 3 + dirX * 2;
        const offsetY = Math.cos(time * 0.5 - dist * 0.005) * 3 + dirY * 2;

        const x = x0 + offsetX;
        const y = y0 + offsetY;

        // Opacity mapping
        const a =
          FLOWING_LIGHT_CONFIG.OPACITY_BASE +
          finalIntensity * FLOWING_LIGHT_CONFIG.OPACITY_SCALE;

        // Draw dot (no stroke, tiny fill)
        ctx.globalAlpha = a;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x, y, FLOWING_LIGHT_CONFIG.DOT_SIZE, 0, Math.PI * 2);
        ctx.fill();
      }

      // Restore alpha to avoid surprises
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(tick);
    }

    // Init
    resize();
    mouseX = width / 2;
    mouseY = height / 2;
    rafId = requestAnimationFrame(tick);

    // Events
    window.addEventListener("resize", onResize, { passive: true });
    container.addEventListener("mousemove", onMouseMove, { passive: true });

    // Cleanup handle
    container._flowingLightCleanup = function cleanup() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMouseMove);
      if (canvas.parentNode === container) container.removeChild(canvas);
      container._flowingLightCleanup = null;
    };
  }

  // ============================================================================
  // SECTION 5: INITIALIZATION AND BOOT FUNCTIONS
  // ============================================================================
  // Functions that handle the initialization of both animations and ensure
  // they start properly when the DOM is ready
  // ============================================================================

  // Boot once DOM is ready with multiple fallbacks
  function boot() {
    // Try immediately if DOM is already ready
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      startAnimation();
      startTypewriterAnimation();
    }

    // Also listen for DOMContentLoaded
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          startAnimation();
          startTypewriterAnimation();
        },
        {
          once: true,
        }
      );
    }

    // Fallback: try after a short delay regardless of ready state
    setTimeout(() => {
      startAnimation();
      startTypewriterAnimation();
    }, 100);

    // Additional fallback for slow-loading content
    setTimeout(() => {
      startAnimation();
      startTypewriterAnimation();
    }, 500);
  }
  boot();

  // ============================================================================
  // SECTION 6: MUTATION OBSERVERS AND SPA SUPPORT
  // ============================================================================
  // Observers that watch for DOM changes and restart animations when needed,
  // particularly useful for Single Page Applications (SPAs)
  // ============================================================================

  // Watch for container element to be added to DOM
  const containerObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the container was added or if it contains the container
            if (
              node.id === "flowing-light-container" ||
              (node.querySelector &&
                node.querySelector("#flowing-light-container"))
            ) {
              startAnimation();
              startTypewriterAnimation();
              return;
            }
          }
        }
      }
    }
  });

  // Start observing the document for container additions
  containerObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Re-init on SPA-like URL changes (still lightweight)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      startAnimation();
      startTypewriterAnimation();
    }
  }).observe(document, { subtree: true, childList: true });

  // ============================================================================
  // SECTION 7: CLEANUP AND EXPORT
  // ============================================================================
  // Global cleanup functions and any exports needed for external control
  // ============================================================================

  // Global cleanup function for external use
  window.hifiAnimations = {
    stopTypewriter: stopTypewriterAnimation,
    startTypewriter: startTypewriterAnimation,
    stopFlowingLight: () => {
      const container = document.getElementById("flowing-light-container");
      if (container && container._flowingLightCleanup) {
        container._flowingLightCleanup();
      }
    },
    startFlowingLight: startAnimation,
  };
})();
