/**
 * Frugal Challenge Card (Pure Vanilla JS)
 */
import { challenge } from '../lib/challenge.js';
import { formatIDR } from '../lib/money.js';

export function renderChallengeCard(container, { state, derived, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  const result = challenge(state, derived);
  if (!result) {
    container.innerHTML = '';
    return;
  }

  const deficit = result.left < 0;
  const circumference = 2 * Math.PI * 34;
  const progress = Math.min(1, result.spent / Math.max(1, result.target));
  const progressArc = progress * circumference;
  const statusColor = deficit ? 'var(--danger)' : result.finished ? 'var(--ok)' : 'var(--accent)';

  container.innerHTML = `
    <section class="card challenge-card" aria-label="${isEn ? 'Frugal Challenge' : 'Tantangan Hemat'}">
      <header class="card-head">
        <h2>${isEn ? 'Frugal Challenge' : 'Tantangan Hemat'}</h2>
        <span class="chip" style="background: var(--surface-3); color: var(--text); font-weight: 600;">
          ${result.points} ${isEn ? 'pts' : 'poin'}
        </span>
      </header>

      <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 14px;">
        <div
          role="progressbar"
          aria-valuenow="${result.progressPct}"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="${isEn ? 'Challenge spending progress' : 'Progres pengeluaran tantangan'}"
          style="position: relative; width: 80px; height: 80px; flex-shrink: 0;"
        >
          <svg width="80" height="80" style="transform: rotate(-90deg);">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-3)" stroke-width="7" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="${statusColor}"
              stroke-width="7"
              stroke-dasharray="${progressArc} ${circumference}"
              stroke-linecap="round"
              style="transition: stroke-dasharray 0.8s ease;"
            />
          </svg>
          <div
            style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;"
          >
            <strong style="font-size: 16px; font-weight: 700; color: ${statusColor};">
              ${result.progressPct}%
            </strong>
          </div>
        </div>

        <div style="flex: 1; min-width: 140px;">
          <p class="muted small" style="margin: 0 0 4px;">
            ${isEn ? 'Target:' : 'Target:'} <strong style="color: var(--text);">${formatIDR(result.target)}</strong>
            <span>${isEn ? ' (80% of allowance)' : ' (80% uang jajan)'}</span>
          </p>
          <p class="muted small" style="margin: 0 0 6px;">
            ${isEn ? 'Spent:' : 'Terpakai:'} <strong style="color: ${statusColor};">${formatIDR(result.spent)}</strong>
          </p>

          ${
            deficit
              ? `<p class="challenge-status text-danger" style="margin: 0; font-size: 13px;">
                  ${isEn ? `Over by ${formatIDR(-result.left)}. Challenge failed.` : `Kelebihan ${formatIDR(-result.left)}. Tantangan gagal.`}
                </p>`
              : result.finished
              ? `<p class="challenge-status text-ok" style="margin: 0; font-size: 13px;">
                  ${isEn ? `Passed! ${formatIDR(result.left)} remaining unused.` : `Lolos! Sisa ${formatIDR(result.left)} tidak terpakai.`}
                </p>`
              : `<p class="challenge-status" style="margin: 0; font-size: 13px;">
                  ${isEn ? `On track: ${formatIDR(result.left)} remaining.` : `Di jalur hemat: sisa ${formatIDR(result.left)}.`}
                </p>`
          }
        </div>
      </div>

      ${
        result.streak > 0
          ? `<div
              style="display: inline-flex; align-items: center; gap: 6px; background: var(--ok-soft); color: var(--ok); padding: 4px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600;"
            >
              ${isEn ? `${result.streak} period winning streak!` : `Menang beruntun ${result.streak} periode!`}
            </div>`
          : ''
      }
    </section>
  `;
}
