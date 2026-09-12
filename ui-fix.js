(() => {
  const scoreEl = document.getElementById('scoreDisplay');
  const finalScoreEl = document.getElementById('finalScore');
  const livesEl = document.getElementById('livesDisplay');
  const uiEl = document.getElementById('ui');

  if (uiEl) uiEl.style.zIndex = '3';
  if (scoreEl) scoreEl.style.visibility = 'visible';
  if (livesEl) livesEl.style.visibility = 'visible';

  const cleanFinalScore = () => {
    if (!finalScoreEl) return;
    const text = finalScoreEl.textContent || '';
    const match = text.match(/^SCORE:\s*([0-9]+(?:\.[0-9]+)?)\s*•\s*BEST:\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) return;
    const score = Math.floor(Number(match[1]) || 0);
    const best = Math.floor(Number(match[2]) || 0);
    finalScoreEl.textContent = `SCORE: ${score.toLocaleString()} • BEST: ${best.toLocaleString()}`;
  };

  const observer = new MutationObserver(cleanFinalScore);
  if (finalScoreEl) observer.observe(finalScoreEl, { childList: true, characterData: true, subtree: true });
  cleanFinalScore();
})();
