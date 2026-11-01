/**
 * Progress Bar (Pure Vanilla JS)
 */
export function renderProgressBar(container, { percent = 0, color = 'var(--accent)', height = 8 }) {
  if (!container) return;
  const clamped = Math.min(100, Math.max(0, percent));
  container.innerHTML = `
    <div class="progress-bar-track" style="width: 100%; height: ${height}px; background: var(--bg-surface-soft, rgba(0,0,0,0.06)); border-radius: 999px; overflow: hidden;">
      <div class="progress-bar-fill" style="width: ${clamped}%; height: 100%; background: ${color}; border-radius: 999px; transition: width 0.3s ease;"></div>
    </div>
  `;
}
