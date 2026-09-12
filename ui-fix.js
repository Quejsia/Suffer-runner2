(() => {
  const scoreEl = document.getElementById('scoreDisplay');
  const finalScoreEl = document.getElementById('finalScore');
  const livesEl = document.getElementById('livesDisplay');
  const uiEl = document.getElementById('ui');

  // Keep the HUD above the canvas without creating a second animation/update loop.
  if (uiEl) {
    uiEl.style.zIndex = '50';
    uiEl.style.visibility = 'visible';
    uiEl.style.display = 'flex';
  }
  if (scoreEl) scoreEl.style.visibility = 'visible';
  if (livesEl) livesEl.style.visibility = 'visible';

  // Format the game-over score once, but do not write the same value repeatedly.
  const cleanFinalScore = () => {
    if (!finalScoreEl) return;
    const text = finalScoreEl.textContent || '';
    const match = text.match(/^SCORE:\s*([0-9]+(?:\.[0-9]+)?)\s*•\s*BEST:\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) return;
    const score = Math.floor(Number(match[1]) || 0).toLocaleString();
    const best = Math.floor(Number(match[2]) || 0).toLocaleString();
    const cleaned = `SCORE: ${score} • BEST: ${best}`;
    if (text !== cleaned) finalScoreEl.textContent = cleaned;
  };

  const observer = new MutationObserver(cleanFinalScore);
  if (finalScoreEl) observer.observe(finalScoreEl, { childList: true, characterData: true, subtree: true });
  cleanFinalScore();
})();
