/**
 * Floating Quick & Reverse Calculator (Pure Vanilla JS)
 */
import { reversePlan } from '../lib/reverse.js';
import { formatIDR } from '../lib/money.js';
import { roundTo500 } from '../lib/allocation.js';
import { bindMoneyInput } from './MoneyInput.js';

const KEYS = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', ',', '='],
];

export function renderCalculator(container, { onUseNumber, onClose: _onClose, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let display = '0';
  let accumulator = null;
  let pending = null;
  let fresh = true;
  let mode = 'standar'; // 'standar' | 'terbalik'
  let revTarget = 0;
  let revSaved = 0;
  let revMonths = 12;

  function compute(a, b, op) {
    if (op === '+') return a + b;
    if (op === '−') return a - b;
    if (op === '×') return a * b;
    if (op === '÷') return b === 0 ? NaN : a / b;
    return b;
  }

  function show(value) {
    if (!Number.isFinite(value)) return isEn ? 'Cannot divide by zero' : 'Tidak bisa dibagi nol';
    const rounded = Math.round(value * 1e10) / 1e10;
    return String(rounded).replace('.', ',');
  }

  function press(key) {
    const current = Number(display.replace(',', '.')) || 0;

    if (key === 'C') {
      display = '0';
      accumulator = null;
      pending = null;
      fresh = true;
      render();
      return;
    }
    if (key === '±') {
      display = display.startsWith('-') ? display.slice(1) : display === '0' ? display : `-${display}`;
      render();
      return;
    }
    if (key === '%') {
      display = show(current / 100);
      fresh = true;
      render();
      return;
    }
    if (key === ',') {
      if (fresh) {
        display = '0,';
        fresh = false;
      } else if (!display.includes(',')) {
        display = `${display},`;
      }
      render();
      return;
    }
    if (['+', '−', '×', '÷'].includes(key)) {
      let value = current;
      if (pending !== null && accumulator !== null && !fresh) {
        value = compute(accumulator, current, pending);
        display = show(value);
      }
      accumulator = value;
      pending = key;
      fresh = true;
      render();
      return;
    }
    if (key === '=') {
      if (pending !== null && accumulator !== null) {
        const value = compute(accumulator, current, pending);
        display = show(value);
        accumulator = null;
        pending = null;
        fresh = true;
      }
      render();
      return;
    }

    display = fresh || display === '0' || display.includes('bagi') || display.includes('divide') ? key : `${display}${key}`;
    fresh = false;
    render();
  }

  function render() {
    const current = Number(display.replace(',', '.')) || 0;
    const reverse = reversePlan({ target: revTarget, saved: revSaved, months: revMonths });

    container.innerHTML = `
      <section class="calc" role="region" aria-label="${isEn ? 'Quick calculator' : 'Kalkulator cepat'}">
        <div class="calc-head">
          <span class="calc-title">${isEn ? 'Quick Calculator' : 'Kalkulator'}</span>
          ${onUseNumber !== undefined && mode === 'standar' ? `
            <button
              type="button"
              class="btn btn-sm btn-ghost btn-use-number"
              ${current <= 0 ? 'disabled' : ''}
            >${isEn ? 'Use number' : 'Pakai angka'}</button>
          ` : ''}
        </div>

        <div class="calc-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected="${mode === 'standar'}"
            class="btn btn-ghost btn-sm btn-tab-standar${mode === 'standar' ? ' btn-active' : ''}"
          >${isEn ? 'Standard' : 'Standar'}</button>
          <button
            type="button"
            role="tab"
            aria-selected="${mode === 'terbalik'}"
            class="btn btn-ghost btn-sm btn-tab-terbalik${mode === 'terbalik' ? ' btn-active' : ''}"
          >${isEn ? 'Reverse' : 'Terbalik'}</button>
        </div>

        ${mode === 'terbalik' ? `
          <div class="reverse">
            <p class="muted small">
              ${isEn
                ? 'Have a savings target and wondering how much to set aside per month? Calculate it automatically here!'
                : 'Punya target tapi bingung harus nyisihin berapa per bulan? Hitung otomatis di sini yuk!'}
            </p>
            <div class="field">
              <label for="rev-target">${isEn ? 'Target (Rp)' : 'Target (Rp)'}</label>
              <input id="rev-target" class="input input-money input-rev-target" type="text" inputmode="numeric" value="${revTarget > 0 ? revTarget.toLocaleString('id-ID') : ''}" />
            </div>
            <div class="field">
              <label for="rev-saved">${isEn ? 'Already saved (Rp)' : 'Sudah punya (Rp)'}</label>
              <input id="rev-saved" class="input input-money input-rev-saved" type="text" inputmode="numeric" value="${revSaved > 0 ? revSaved.toLocaleString('id-ID') : ''}" />
            </div>
            <div class="field">
              <label for="rev-months">${isEn ? 'Timeframe (months)' : 'Dalam waktu (bulan)'}</label>
              <input
                id="rev-months"
                class="input input-rev-months"
                type="number"
                min="1"
                max="600"
                value="${revMonths}"
              />
            </div>
            ${reverse !== null ? `
              <ul class="rec-list">
                ${reverse.achieved ? `
                  <li>
                    <span>Status</span>
                    <strong>${isEn ? 'Target already achieved' : 'Target sudah tercapai'}</strong>
                  </li>
                ` : `
                  <li>
                    <span>${isEn ? 'Remaining needed' : 'Sisa yang dibutuhkan'}</span>
                    <strong>${formatIDR(reverse.gap)}</strong>
                  </li>
                  <li>
                    <span>${isEn ? 'Monthly deposit' : 'Setoran per bulan'}</span>
                    <strong>${formatIDR(reverse.perMonth)}</strong>
                  </li>
                  <li>
                    <span>${isEn ? 'Weekly deposit' : 'Setoran per minggu'}</span>
                    <strong>${formatIDR(reverse.perWeek)}</strong>
                  </li>
                  <li>
                    <span>${isEn ? 'Daily deposit' : 'Setoran per hari'}</span>
                    <strong>${formatIDR(roundTo500(reverse.perDay))}</strong>
                  </li>
                `}
              </ul>
            ` : ''}
          </div>
        ` : `
          <div class="calc-display" aria-live="polite">
            ${display}
          </div>

          <div class="calc-keys">
            ${KEYS.flat().map((key) => `
              <button
                type="button"
                class="calc-key${['÷', '×', '−', '+', '='].includes(key) ? ' calc-op' : ''}${key === 'C' ? ' calc-clear' : ''}"
                data-key="${key}"
              >${key}</button>
            `).join('')}
          </div>
        `}
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    container.querySelector('.btn-use-number')?.addEventListener('click', () => {
      const current = Number(display.replace(',', '.')) || 0;
      onUseNumber?.(current);
    });

    container.querySelector('.btn-tab-standar')?.addEventListener('click', () => {
      mode = 'standar';
      render();
    });

    container.querySelector('.btn-tab-terbalik')?.addEventListener('click', () => {
      mode = 'terbalik';
      render();
    });

    if (mode === 'terbalik') {
      const targetInput = container.querySelector('#rev-target');
      if (targetInput) {
        bindMoneyInput(targetInput, (val) => {
          revTarget = val;
          render();
        });
      }

      const savedInput = container.querySelector('#rev-saved');
      if (savedInput) {
        bindMoneyInput(savedInput, (val) => {
          revSaved = val;
          render();
        });
      }

      const monthsInput = container.querySelector('#rev-months');
      monthsInput?.addEventListener('input', (e) => {
        revMonths = Math.max(1, Number(e.target.value) || 1);
        render();
      });
    } else {
      container.querySelectorAll('.calc-key').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          if (key) press(key);
        });
      });
    }
  }

  render();
}
