/**
 * Savings Targets & 8% Compound Interest (Pure Vanilla JS)
 */
import { formatIDR } from '../lib/money.js';
import { activeGoals, effectiveSaved } from '../lib/state.js';
import { uid } from '../lib/id.js';
import { ageAfter, formatDuration, futureValue, monthsToTarget, requiredDeposit } from '../lib/savings.js';
import { translate } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';
import { bindMoneyInput } from './MoneyInput.js';

const defaultDeposit = (derived) => Math.round(derived.monthly * 0.2);
const monthsLeft = (goal, currentAge) => (goal.targetAge - currentAge) * 12;

function projection(goal, currentAge, savingsByGoal) {
  const months = monthsLeft(goal, currentAge);
  if (goal.target <= 0 || months <= 0) return null;
  const saved = effectiveSaved(goal, savingsByGoal);
  const need = requiredDeposit({ target: goal.target, saved, months });
  const projected = monthsToTarget({ target: goal.target, saved, deposit: goal.deposit });
  const value = futureValue({ target: goal.target, saved, deposit: goal.deposit, months });
  const deposits = goal.deposit * months;
  return { need, projected, value, months, deposits, interest: Math.max(0, value - saved - deposits) };
}

export function renderSavingsPanel(container, { state, derived, update, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  function addGoal() {
    const goal = {
      id: uid('goal'),
      name: isEn ? `Goal ${state.goals.length + 1}` : `Target ${state.goals.length + 1}`,
      target: 0,
      saved: 0,
      deposit: defaultDeposit(derived),
      targetAge: Math.max(18, state.currentAge + 1),
      primary: state.goals.length === 0,
      active: true,
    };
    update((s) => ({ ...s, goals: [...s.goals, goal] }));
  }

  function patchGoal(id, patch) {
    update((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  }

  function removeGoal(id) {
    update((s) => {
      const rest = s.goals.filter((g) => g.id !== id);
      if (rest.length > 0 && !rest.some((g) => g.primary)) {
        return { ...s, goals: rest.map((g, idx) => (idx === 0 ? { ...g, primary: true } : g)) };
      }
      return { ...s, goals: rest };
    });
  }

  function render() {
    const goals = Array.isArray(state?.goals) ? state.goals : [];
    const savingsByGoal = (derived && derived.savingsByGoal) ? derived.savingsByGoal : {};
    const age = state?.currentAge || 0;
    const recommendations = activeGoals(goals)
      .map((goal) => ({ goal, calc: projection(goal, age, savingsByGoal) }))
      .filter((item) => item.calc !== null);

    const goalsHtml = goals.map((goal) => {
      const months = monthsLeft(goal, age);
      const logged = savingsByGoal[goal.id] ?? 0;
      const savedNow = effectiveSaved(goal, savingsByGoal);
      const percent = goal.target > 0 ? Math.round((savedNow / goal.target) * 100) : 0;

      return `
        <article class="goal${goal.primary ? ' goal-primary' : ''}${goal.active ? '' : ' goal-off'}" data-id="${escapeHtml(goal.id)}">
          <header class="goal-head">
            <input
              class="input input-name"
              value="${escapeHtml(goal.name)}"
              aria-label="${isEn ? 'Goal name' : 'Nama target'}"
            />
            <div class="goal-head-actions">
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-toggle-active${goal.active ? ' btn-active' : ''}"
                aria-pressed="${goal.active}"
              >
                ${goal.active ? translate('savings.active', lang) : translate('savings.inactive', lang)}
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-set-primary${goal.primary ? ' btn-active' : ''}"
              >
                ${goal.primary ? translate('savings.primary', lang) : translate('savings.setPrimary', lang)}
              </button>
              <button type="button" class="btn btn-ghost btn-sm btn-danger btn-delete-goal">
                ${translate('savings.deleteBtn', lang)}
              </button>
            </div>
          </header>

          <div class="form-grid form-grid-2">
            <div class="field">
              <label>${translate('savings.targetAmount', lang)}</label>
              <input type="text" inputmode="numeric" class="input input-money input-goal-target" value="${goal.target > 0 ? goal.target.toLocaleString('id-ID') : ''}" />
            </div>
            <div class="field">
              <label>${translate('savings.otherSaved', lang)}</label>
              <input type="text" inputmode="numeric" class="input input-money input-goal-saved" value="${goal.saved > 0 ? goal.saved.toLocaleString('id-ID') : ''}" />
            </div>
            <div class="field">
              <label>${isEn ? 'Actual monthly deposit (Rp)' : 'Setoran riil / bulan (Rp)'}</label>
              <input type="text" inputmode="numeric" class="input input-money input-goal-deposit" value="${goal.deposit > 0 ? goal.deposit.toLocaleString('id-ID') : ''}" />
            </div>
            <div class="field">
              <label>${isEn ? 'Target age' : 'Dicapai di umur'}</label>
              <input
                class="input input-goal-target-age"
                type="number"
                min="18"
                value="${goal.targetAge}"
              />
            </div>
          </div>

          <div class="goal-progress">
            <div class="progress-bar-track" style="height: 8px; background: rgba(0,0,0,0.06); border-radius: 999px; overflow: hidden; margin: 8px 0;">
              <div class="progress-bar-fill" style="width: ${percent}%; height: 100%; background: var(--ok, #2f9e44); border-radius: 999px;"></div>
            </div>
            <span class="muted small">
              ${formatIDR(savedNow)} / ${formatIDR(goal.target)} (${percent}%)
              ${
                months > 0
                  ? isEn
                    ? ` · ${formatDuration(months, lang)} left`
                    : ` · ${formatDuration(months, lang)} lagi`
                  : isEn
                    ? ' · target age has passed'
                    : ' · umur target sudah lewat nih'
              }
            </span>
            ${
              logged > 0
                ? `<span class="muted small">
                    ${isEn ? `= manual balance ${formatIDR(goal.saved)} + from savings category ${formatIDR(logged)}` : `= saldo manual ${formatIDR(goal.saved)} + dari catatan kategori tabungan ${formatIDR(logged)}`}
                  </span>`
                : ''
            }
          </div>
        </article>
      `;
    }).join('');

    const recsHtml = recommendations.map(({ goal, calc }) => `
      <div class="recommend" data-id="${escapeHtml(goal.id)}">
        <h3 class="section-title">
          ${isEn ? `Projection for ${goal.name}` : `Perhitungan untuk ${goal.name}`}
        </h3>
        <ul class="rec-list">
          <li>
            <span>${isEn ? 'Recommended deposit' : 'Rekomendasi setoran'}</span>
            <strong>
              ${calc.need === null ? '·' : `${formatIDR(calc.need)} ${isEn ? '/ month' : '/ bulan'}`}
            </strong>
          </li>
          <li>
            <span>${isEn ? 'Your actual deposit' : 'Setoran riil kamu'}</span>
            <strong>${formatIDR(goal.deposit)} ${isEn ? '/ month' : '/ bulan'}</strong>
          </li>
          <li>
            <span>${isEn ? 'Estimated completion' : 'Perkiraan tercapai'}</span>
            <strong>
              ${
                calc.projected === null
                  ? isEn
                    ? 'Not calculated yet (enter deposit first)'
                    : 'Belum kehitung (masukin setoran dulu yuk)'
                  : calc.projected === 0
                    ? isEn ? 'Already reached' : 'Sudah tercapai'
                    : `${isEn ? 'age' : 'umur'} ${ageAfter(state.currentAge, calc.projected, lang).label} (${formatDuration(calc.projected, lang)})`
              }
            </strong>
          </li>
          <li>
            <span>
              ${isEn ? `Savings value at age ${goal.targetAge}` : `Nilai tabungan di umur ${goal.targetAge}`}
            </span>
            <strong>
              ${formatIDR(calc.value)}
              <span class="muted small">
                ${
                  isEn
                    ? ` (deposits ${formatIDR(calc.deposits)} + interest ${formatIDR(calc.interest)})`
                    : ` (setoran ${formatIDR(calc.deposits)} + bunga ${formatIDR(calc.interest)})`
                }
              </span>
            </strong>
          </li>
        </ul>
      </div>
    `).join('');

    container.innerHTML = `
      <section class="card savings-panel">
        <header class="card-head">
          <h2>${translate('savings.title', lang)}</h2>
          <span class="muted small">${translate('savings.sub', lang)}</span>
        </header>

        <div class="field field-inline">
          <label for="age-now">${translate('savings.ageLabel', lang)}</label>
          <input
            id="age-now"
            class="input input-narrow"
            type="number"
            min="1"
            max="90"
            value="${state.currentAge}"
          />
          <span class="muted small">${translate('savings.ageUnit', lang)}</span>
        </div>

        <div class="goal-list">
          ${goalsHtml}
        </div>

        <button type="button" class="btn btn-ghost btn-add-goal">
          ${translate('savings.addBtn', lang)}
        </button>
        ${
          state.goals.length === 0
            ? `<p class="muted small">
                ${isEn ? 'No savings goals yet. Create one to stay motivated!' : 'Belum ada target tabungan nih. Bikin satu yuk biar semangat nabungnya!'}
              </p>`
            : ''
        }

        ${recsHtml}
        ${
          state.goals.length > 0 && recommendations.length === 0
            ? `<p class="muted small">
                ${isEn ? 'No active target to calculate yet. Please activate one of the goals above.' : 'Belum ada target aktif yang bisa dihitung nih. Coba aktifkan salah satu target di atas ya.'}
              </p>`
            : ''
        }
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.savings-panel');
    if (!root) return;

    root.querySelector('#age-now')?.addEventListener('change', (e) => {
      const age = Math.max(1, Number(e.target.value) || 1);
      update((s) => ({ ...s, currentAge: age }));
    });

    root.querySelector('.btn-add-goal')?.addEventListener('click', addGoal);

    root.querySelectorAll('.goal').forEach((goalEl) => {
      const id = goalEl.dataset.id;
      const goal = state.goals.find((g) => g.id === id);
      if (!goal) return;

      goalEl.querySelector('.input-name')?.addEventListener('input', (e) => {
        patchGoal(id, { name: e.target.value });
      });

      goalEl.querySelector('.btn-toggle-active')?.addEventListener('click', () => {
        patchGoal(id, { active: !goal.active });
      });

      goalEl.querySelector('.btn-set-primary')?.addEventListener('click', () => {
        update((s) => ({ ...s, goals: s.goals.map((item) => ({ ...item, primary: item.id === id })) }));
      });

      goalEl.querySelector('.btn-delete-goal')?.addEventListener('click', () => {
        removeGoal(id);
      });

      const targetInput = goalEl.querySelector('.input-goal-target');
      if (targetInput) {
        bindMoneyInput(targetInput, (val) => patchGoal(id, { target: val }));
      }

      const savedInput = goalEl.querySelector('.input-goal-saved');
      if (savedInput) {
        bindMoneyInput(savedInput, (val) => patchGoal(id, { saved: val }));
      }

      const depInput = goalEl.querySelector('.input-goal-deposit');
      if (depInput) {
        bindMoneyInput(depInput, (val) => patchGoal(id, { deposit: val }));
      }

      goalEl.querySelector('.input-goal-target-age')?.addEventListener('change', (e) => {
        patchGoal(id, { targetAge: Math.max(18, Number(e.target.value) || 18) });
      });
    });
  }

  render();
}
