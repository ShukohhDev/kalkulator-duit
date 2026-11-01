/**
 * Financial Health Score Card (Pure Vanilla JS)
 */
import { healthScore } from '../lib/health.js';
import { escapeHtml } from '../lib/dom.js';

function getScoreGrade(score, lang) {
  if (score >= 85) return { color: 'var(--ok)', label: lang === 'en' ? 'Outstanding' : 'Luar biasa' };
  if (score >= 70) return { color: 'var(--ok)', label: lang === 'en' ? 'Healthy' : 'Sehat' };
  if (score >= 50) return { color: 'var(--warn)', label: lang === 'en' ? 'Needs Attention' : 'Perlu perhatian' };
  return { color: 'var(--danger)', label: lang === 'en' ? 'Critical' : 'Kritis' };
}

export function renderHealthCard(container, { state, derived, lang = 'id' }) {
  if (!container) return;

  const now = new Date();
  const result = healthScore(state, derived, now, lang);
  const { color } = getScoreGrade(result.score, lang);
  const circumference = 2 * Math.PI * 40;
  const progress = (result.score / 100) * circumference;

  container.innerHTML = `
    <section class="card health-card" aria-label="${lang === 'en' ? 'Financial health score' : 'Skor kesehatan keuangan'}">
      <header class="card-head">
        <h2>${lang === 'en' ? 'Financial Health Score' : 'Skor Kesehatan Keuangan'}</h2>
      </header>

      <div style="display: flex; gap: 24px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
        <div style="position: relative; width: 100px; height: 100px; flex-shrink: 0;">
          <svg width="100" height="100" style="transform: rotate(-90deg);">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--surface-3)" stroke-width="8" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="${color}"
              stroke-width="8"
              stroke-dasharray="${progress} ${circumference}"
              stroke-linecap="round"
              style="transition: stroke-dasharray 0.8s ease;"
            />
          </svg>
          <div
            style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;"
          >
            <strong class="health-score" style="color: ${color}; font-size: 24px; line-height: 1;">
              ${result.score}
            </strong>
            <span style="font-size: 11px; color: var(--muted); font-weight: 600; margin-top: 2px;">/100</span>
          </div>
        </div>

        <div style="flex: 1; min-width: 160px;">
          <p class="health-grade" style="color: ${color}; margin: 0 0 6px; font-size: 16px; font-weight: 700;">
            ${escapeHtml(result.grade)}
          </p>
          <p class="muted small" style="margin: 0; line-height: 1.5;">
            ${
              lang === 'en'
                ? 'This score is automatically calculated from how you allocate, save, and manage your spending habits.'
                : 'Skor ini dinilai otomatis dari caramu ngatur alokasi, nabung, dan nahan pengeluaran.'
            }
          </p>
        </div>
      </div>

      <ul class="rec-list">
        ${result.indicators.map((item) => `
          <li>
            <span>
              ${escapeHtml(item.label)}
              <span class="muted small"> · ${escapeHtml(item.detail)}</span>
            </span>
            <strong
              style="color: ${item.score < 50 ? 'var(--danger)' : item.score >= 80 ? 'var(--ok)' : 'var(--warn)'}; font-size: 15px;"
            >
              ${item.score}
            </strong>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}
