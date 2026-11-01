/**
 * What-If Budget Simulation Panel (Pure Vanilla JS)
 */
import { whatIf } from '../lib/whatif.js';
import { formatIDR, roundTo500 } from '../lib/money.js';

const ALLOWANCE_STEPS = [0, -30, -20, -10, 10, 20, 30];
const PACE_STEPS = [-30, -20, -10, 0, 10, 20];

export function renderWhatIfPanel(container, { state, derived, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  let allowancePct = container._whatifAllowance ?? 0;
  let pacePct = container._whatifPace ?? 0;

  function render() {
    const result = whatIf(state, derived, { allowancePct, pacePct });
    if (!result) {
      container.innerHTML = '';
      return;
    }

    const endLabel =
      result.projectedEnd >= 0
        ? isEn
          ? `Remaining ${formatIDR(result.projectedEnd)}`
          : `Sisa ${formatIDR(result.projectedEnd)}`
        : isEn
          ? `Deficit ${formatIDR(-result.projectedEnd)}`
          : `Kurang ${formatIDR(-result.projectedEnd)}`;
    const delta = result.projectedEnd - result.currentEnd;

    container.innerHTML = `
      <section class="card whatif-card" role="region" aria-label="${isEn ? 'What If Simulation' : 'Simulasi Bagaimana Kalau'}">
        <header class="card-head">
          <h2>${isEn ? 'What If' : 'Bagaimana Kalau'}</h2>
          <span class="muted small">
            ${isEn
              ? 'simulation only (relaxed, does not modify your data)'
              : 'simulasi saja (santai, tidak mengubah data kamu)'}
          </span>
        </header>

        <div class="form-grid form-grid-2">
          <div class="field">
            <label for="whatif-allowance">
              ${isEn ? 'Allowance changes' : 'Uang jajan berubah'}
            </label>
            <select
              id="whatif-allowance"
              class="input"
              title="${isEn ? 'Select Allowance Change' : 'Pilih Perubahan Uang Jajan'}"
            >
              ${ALLOWANCE_STEPS.map((step) => `
                <option value="${step}"${step === allowancePct ? ' selected' : ''}>
                  ${step === 0
                    ? isEn
                      ? 'Unchanged (100%)'
                      : 'Tetap (100%)'
                    : `${step > 0 ? '+' : ''}${step}%`}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="field">
            <label for="whatif-pace">
              ${isEn ? 'Spending pace' : 'Laju pengeluaran'}
            </label>
            <select
              id="whatif-pace"
              class="input"
              title="${isEn ? 'Select Spending Pace' : 'Pilih Laju Pengeluaran'}"
            >
              ${PACE_STEPS.map((step) => `
                <option value="${step}"${step === pacePct ? ' selected' : ''}>
                  ${step === 0
                    ? isEn
                      ? 'Same as now'
                      : 'Sama seperti sekarang'
                    : isEn
                      ? `${step > 0 ? 'up' : 'down'} ${Math.abs(step)}%`
                      : `${step > 0 ? 'naik' : 'turun'} ${Math.abs(step)}%`}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <ul class="rec-list">
          <li>
            <span>${isEn ? 'Scenario allowance' : 'Uang jajan skenario'}</span>
            <strong>${formatIDR(result.allowance)}</strong>
          </li>
          <li>
            <span>
              ${isEn ? 'Projected period-end expense' : 'Proyeksi pengeluaran akhir periode'}
            </span>
            <strong>${formatIDR(result.projectedExpense)}</strong>
          </li>
          <li>
            <span>${isEn ? 'Estimated at period end' : 'Perkiraan saat periode berakhir'}</span>
            <strong class="${result.projectedEnd < 0 ? 'text-danger' : ''}">${endLabel}</strong>
          </li>
          <li>
            <span>${isEn ? 'Daily spending allowance' : 'Boleh belanja per hari'}</span>
            <strong>${formatIDR(roundTo500(result.perDay))}</strong>
          </li>
        </ul>
        ${Math.abs(delta) >= 1 ? `
          <p class="muted small">
            ${isEn
              ? `${delta > 0 ? 'More relaxed by' : 'Tighter by'} ${formatIDR(Math.abs(delta))} compared to current.`
              : `${delta > 0 ? 'Lebih lega' : 'Lebih ketat'} ${formatIDR(Math.abs(delta))} dibanding kondisi sekarang.`}
          </p>
        ` : ''}
      </section>
    `;

    container.querySelector('#whatif-allowance')?.addEventListener('change', (e) => {
      allowancePct = Number(e.target.value);
      container._whatifAllowance = allowancePct;
      render();
    });

    container.querySelector('#whatif-pace')?.addEventListener('change', (e) => {
      pacePct = Number(e.target.value);
      container._whatifPace = pacePct;
      render();
    });
  }

  render();
}
