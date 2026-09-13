/*
 * SHORE DASH — swipe-first mobile input
 *
 * Touch gestures are intentionally simple:
 *   Tap             -> jump
 *   Swipe up        -> jump
 *   Swipe left/right-> quick directional dodge
 *   Swipe down      -> slide under low hazards
 *
 * The canvas is the control surface; legacy on-screen controls remain hidden.
 */
(() => {
  const canvas = document.getElementById('c');
  if (!canvas) return;

  const SWIPE_THRESHOLD = 44;
  const TAP_MAX_DISTANCE = 20;
  const TAP_MAX_TIME = 280;
  const DODGE_TIME = 220;
  const DODGE_SPEED_MULTIPLIER = 2.8;

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let dodgeTimer = null;

  function stopDodge() {
    if (dodgeTimer) {
      clearTimeout(dodgeTimer);
      dodgeTimer = null;
    }
    if (typeof moveDir !== 'undefined') moveDir = 0;
  }

  function dodge(direction) {
    if (typeof state === 'undefined' || state !== 'playing') return;
    if (typeof player === 'undefined' || typeof moveDir === 'undefined') return;

    player.x += direction * 54;
    if (typeof W !== 'undefined' && typeof player.w !== 'undefined') {
      player.x = Math.max(8, Math.min(W - player.w - 8, player.x));
    }
    moveDir = direction * DODGE_SPEED_MULTIPLIER;
    if (dodgeTimer) clearTimeout(dodgeTimer);
    dodgeTimer = setTimeout(stopDodge, DODGE_TIME);
  }

  function handleGesture(endX, endY, endTime) {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    const elapsed = endTime - startTime;

    if (typeof state === 'undefined' || state !== 'playing') return;

    if (distance <= TAP_MAX_DISTANCE && elapsed <= TAP_MAX_TIME) {
      if (typeof jump === 'function') jump();
      return;
    }

    if (distance < SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      dodge(dx > 0 ? 1 : -1);
    } else if (dy < 0) {
      if (typeof jump === 'function') jump();
    } else {
      if (typeof slide === 'function') slide();
    }
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse') return;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = performance.now();
    event.preventDefault();
    event.stopImmediatePropagation();
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
  }

  function onPointerMove(event) {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function onPointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleGesture(event.clientX, event.clientY, performance.now());
    activePointerId = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  function onPointerCancel(event) {
    if (event.pointerId !== activePointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activePointerId = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    stopDodge();
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', onPointerUp, { passive: false });
  canvas.addEventListener('pointercancel', onPointerCancel, { passive: false });
  window.addEventListener('blur', stopDodge);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopDodge();
  });
})();
