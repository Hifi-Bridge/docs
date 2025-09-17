// Flowing Light Animation for Mintlify Docs (Canvas edition)
(function () {
  // ---- Config ----
  const GRID_SIZE = 25; // logical spacing between dots (px)
  const DOT_SIZE = 1; // radius of each dot (px)
  const OPACITY_BASE = 0.02; // baseline opacity
  const OPACITY_SCALE = 0.5; // how much intensity boosts opacity
  const PROX_RADIUS = 150; // px for proximity boost
  const RESIZE_DEBOUNCE_MS = 150;

  let retryCount = 0;
  const MAX_RETRIES = 20;

  function startAnimation() {
    const container = document.getElementById("flowing-light-container");
    if (!container) {
      if (retryCount < MAX_RETRIES) {
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

      cols = Math.ceil(width / GRID_SIZE);
      rows = Math.ceil(height / GRID_SIZE);

      dots = new Float32Array(cols * rows * 2);
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots[i++] = c * GRID_SIZE;
          dots[i++] = r * GRID_SIZE;
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
      }, RESIZE_DEBOUNCE_MS);
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
      const proxInv = 1 / PROX_RADIUS;

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
        const a = OPACITY_BASE + finalIntensity * OPACITY_SCALE;

        // Draw dot (no stroke, tiny fill)
        ctx.globalAlpha = a;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x, y, DOT_SIZE, 0, Math.PI * 2);
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

  // Boot once DOM is ready with multiple fallbacks
  function boot() {
    // Try immediately if DOM is already ready
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      startAnimation();
    }

    // Also listen for DOMContentLoaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startAnimation, {
        once: true,
      });
    }

    // Fallback: try after a short delay regardless of ready state
    setTimeout(startAnimation, 100);

    // Additional fallback for slow-loading content
    setTimeout(startAnimation, 500);
  }
  boot();

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
    }
  }).observe(document, { subtree: true, childList: true });
})();
