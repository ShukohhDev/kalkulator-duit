/**
 * Custom Select Helper (Pure Vanilla JS)
 */
import { escapeHtml } from '../lib/dom.js';

export function renderSelect(container, { id, className = 'input', options = [], value = '', onChange, title }) {
  if (!container) return;
  const optionsHtml = options.map((opt) => `
    <option value="${escapeHtml(opt.value)}"${opt.value === value ? ' selected' : ''}${opt.disabled ? ' disabled' : ''}>
      ${escapeHtml(opt.label)}
    </option>
  `).join('');

  container.innerHTML = `
    <select id="${escapeHtml(id || '')}" class="${escapeHtml(className)}" title="${escapeHtml(title || '')}">
      ${optionsHtml}
    </select>
  `;

  const sel = container.querySelector('select');
  sel?.addEventListener('change', (e) => {
    onChange?.(e.target.value);
  });
}
