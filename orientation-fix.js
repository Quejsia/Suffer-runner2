(function () {
  'use strict';

  const ui = document.getElementById('ui');
  const controls = document.getElementById('mobileControls');
  const wrapper = document.getElementById('gameWrapper');

  const touchMedia = window.matchMedia('(pointer: coarse)');
  const noHoverMedia = window.matchMedia('(hover: none)');

  function isTouchDevice() {
    return touchMedia.matches || noHoverMedia.matches || navigator.maxTouchPoints > 0;
  }

  function syncTouchLayout() {
    const touch = isTouchDevice();
    document.documentElement.classList.toggle('touch-device', touch);

    if (!ui || !controls || !wrapper) return;

    // Keep the HUD and touch controls visible after portrait/landscape rotation.
    if (touch) {
      ui.style.setProperty('display', 'flex', 'important');
      ui.style.setProperty('visibility', 'visible', 'important');
      ui.style.setProperty('z-index', '200', 'important');

      controls.style.setProperty('display', 'flex', 'important');
      controls.style.setProperty('z-index', '150', 'important');
      controls.style.setProperty('pointer-events', 'none', 'important');

      wrapper.style.setProperty('max-width', 'min(800px, 100vw, 200svh)', 'important');
      wrapper.style.setProperty('max-height', '100svh', 'important');
    }
  }

  syncTouchLayout();

  window.addEventListener('resize', syncTouchLayout, { passive: true });
  window.addEventListener('orientationchange', function () {
    requestAnimationFrame(syncTouchLayout);
    setTimeout(syncTouchLayout, 150);
  }, { passive: true });

  if (touchMedia.addEventListener) touchMedia.addEventListener('change', syncTouchLayout);
  else if (touchMedia.addListener) touchMedia.addListener(syncTouchLayout);

  if (noHoverMedia.addEventListener) noHoverMedia.addEventListener('change', syncTouchLayout);
  else if (noHoverMedia.addListener) noHoverMedia.addListener(syncTouchLayout);
})();
