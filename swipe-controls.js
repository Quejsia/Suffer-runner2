/*
 * SHORE DASH — swipe-first mobile controls
 *
 * Experimental input layer:
 *   Tap            -> jump
 *   Swipe up       -> jump
 *   Swipe left     -> quick dodge left
 *   Swipe right    -> quick dodge right
 *
 * The old joystick/jump-button DOM hooks remain hidden for compatibility,
 * but this layer intentionally makes the canvas itself the control surface.
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
  let previousMoveDir = 0;

  function stopDodge() {
    if (dodgeTimer) {
      clearTimeout(dodgeTimer);
      dodgeTimer = null;
    }
    if (typeof moveDir !== 'undefined') moveDir = 0;
  }

  function dodge(direction) {
    if (typeof state === 'undefined' || state !== 'playing') return;
    if (typeof player !== 'undefined' && typeof moveDir !== 'undefined') {
      const nudge = 54;
      player.x += direction * nudge;
      player.x = Math.max(8, Math.min(W - player.w - 8, player.x));
      moveDir = direction * DODGE_SPEED_MULTIPLIER;
      previousMoveDir = moveDir;
      if (dodgeTimer) clearTimeout(dodgeTimer);
      dodgeTimer = setTimeout(stopDodge, DODGE_TIME);
    }
  }

  function handleGesture(endX, endY, endTime) {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    const elapsed = endTime - startTime;

    if (typeof state === 'undefined' || state !== 'playing') return;

    // A short touch anywhere on the game surface is the jump action.
    if (distance <= TAP_MAX_DISTANCE && elapsed <= TAP_MAX_TIME) {
      if (typeof jump === 'function') jump();
      return;
    }

    if (distance < SWIPE_THRESHOLD) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      dodge(dx > 0 ? 1 : -1);
    } else if (dy < 0) {
      if (typeof jump === 'function') jump();
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
