/**
 * Mini Calendar Day Picker (Pure Vanilla JS)
 */
import { escapeHtml } from '../lib/dom.js';

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

export function renderMiniCalendar(container, { id = 'due-day', value = 1, onChange, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  container.innerHTML = `
    <div class="field">
      <label id="${escapeHtml(id)}-label">
        ${isEn ? 'Due date (1-31)' : 'Tgl jatuh tempo (1-31)'}
      </label>
      <div id="${escapeHtml(id)}" class="mini-cal" role="radiogroup" aria-labelledby="${escapeHtml(id)}-label">
        ${DAYS.map((day) => `
          <button
            type="button"
            data-day="${day}"
            role="radio"
            aria-checked="${value === day}"
            aria-label="${isEn ? `Day ${day}` : `Tanggal ${day}`}"
            class="mini-day${value === day ? ' mini-day-on' : ''}"
          >
            ${day}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.mini-day').forEach((btn) => {
    btn.addEventListener('click', () => {
      const day = Number(btn.dataset.day);
      onChange?.(day);
    });
  });
}

