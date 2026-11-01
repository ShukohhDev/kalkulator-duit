/**
 * Hero Allowance & Budget Card (Pure Vanilla JS)
 */
import { formatIDR } from '../lib/money.js';
import { bonusAmounts, splitTotal } from '../lib/bonus.js';
import { latePlan } from '../lib/lateperiod.js';
import { LIFESTYLES, applyLifestyle, findLifestyle } from '../lib/lifestyles.js';
import { roundAllocationCategories, roundTo500 } from '../lib/allocation.js';
import { translate } from '../lib/i18n.js';
import { escapeHtml } from '../lib/dom.js';
import { bindMoneyInput } from './MoneyInput.js';
import { renderAllocationEditor } from './AllocationEditor.js';

const pctText = (ratio) => `${String(Number((ratio * 100).toFixed(1))).replace('.', ',')}%`;

const BONUS_FIELDS = [
  { key: 'savings', label: 'Tabungan', id: 'bonus-savings' },
  { key: 'buffer', label: 'Dana darurat / target', id: 'bonus-buffer' },
  { key: 'fun', label: 'Keinginan', id: 'bonus-fun' },
];

export function renderAllowanceCard(container, { state, derived, getState, update, notify, onChangePeriod, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';
  const mode = state.mode;

  let currentState = state;
  function getCurrentState() {
    return getState ? getState() : (currentState || state);
  }

  let editing = Boolean(container._allocEditing);
  let zeroPending = container._allocZeroPending || null;
  let lifestyleChoice = container._allocLifestyleChoice || '';
  let isLifestyleOpen = Boolean(container._lifestyleModalOpen);
  let selectedLifestyle = container._selectedLifestyle || (getCurrentState().lifestyle || 'seimbang');

  function setEditing(val) {
    editing = val;
    container._allocEditing = val;
    render();
  }

  function render() {
    const s = getCurrentState();
    const varOn = Boolean(s.incomeVar);
    const bonus = Math.max(0, s.allowanceMax - s.allowance);
    const bonusSplit = s.bonusSplit || { savings: 50, buffer: 30, fun: 20 };
    const totalBonusPct = splitTotal(bonusSplit);
    const amounts = bonusAmounts(bonus, bonusSplit);
    const late = latePlan(s, derived);
    const budget = s.allowance;
    const totalRatio = s.categories.reduce((sum, category) => sum + Math.max(0, category.ratio), 0);
    const pctUsed = budget > 0 ? Math.min(100, Math.round((derived.spentInPeriod / budget) * 100)) : 0;

    container.innerHTML = `
      <section class="card allowance-card">
        <header class="card-head">
          <div>
            <h2>${translate('allowance.title', lang)}</h2>
            <p class="muted small" style="margin: 4px 0 0 0;">
              ${translate('allowance.tagline', lang)}
            </p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="btn btn-ghost btn-sm btn-open-lifestyle">${isEn ? 'Lifestyle Mode' : 'Pilih Gaya Hidup'}</button>
            ${
              onChangePeriod
                ? `<button
                    type="button"
                    class="btn btn-ghost btn-sm btn-change-period"
                    id="btn-change-period"
                  >
                    ${translate('allowance.changePeriod', lang)}
                  </button>`
                : ''
            }
          </div>
        </header>

        <div class="field">
          <label for="allowance">
            ${
              mode
                ? (isEn ? `Pocket money per ${derived.modeLabel?.toLowerCase() || 'period'} (Rp)` : `Uang jajan per ${derived.modeLabel?.toLowerCase() || 'periode'} (Rp)`)
                : translate('allowance.baseLabel', lang)
            }
          </label>
          <input
            id="allowance"
            class="input input-money"
            type="text"
            inputmode="numeric"
            placeholder="${translate('allowance.placeholder', lang)}"
            value="${s.allowance > 0 ? s.allowance.toLocaleString('id-ID') : ''}"
          />
        </div>

        <div class="bonus-block">
          <div class="bonus-row">
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-toggle-var${varOn ? ' btn-active' : ''}"
              aria-pressed="${varOn}"
            >${translate('allowance.variableIncome', lang)}</button>
          </div>
          ${varOn ? `
            <p class="muted small">
              ${translate('allowance.varNote', lang, { amount: formatIDR(s.allowance) })}
            </p>
            <div class="field">
              <label for="allowance-max">
                ${translate('allowance.maxLabel', lang)}
              </label>
              <input
                id="allowance-max"
                class="input input-money"
                type="text"
                inputmode="numeric"
                placeholder="${translate('allowance.maxPlaceholder', lang)}"
                value="${s.allowanceMax > 0 ? s.allowanceMax.toLocaleString('id-ID') : ''}"
              />
            </div>
          ` : ''}

          ${varOn && bonus > 0 ? `
            <div class="bonus-card">
              <header>
                <strong>${isEn ? 'Bonus scenario' : 'Skenario bonus'}</strong>
                <span class="chip">${isEn ? 'Base' : 'Dasar'} ${formatIDR(s.allowance)}</span>
              </header>
              <p class="muted small">
                ${isEn
                  ? `If you get ${formatIDR(s.allowanceMax)}, remaining <strong class="bonus-total">${formatIDR(bonus)}</strong> above base is split:`
                  : `Kalau dapat ${formatIDR(s.allowanceMax)}, sisa <strong class="bonus-total">${formatIDR(bonus)}</strong> di atas dasar dibagi:`}
              </p>
              <div class="bonus-fields">
                ${BONUS_FIELDS.map((field) => `
                  <label class="bonus-field" for="${field.id}">
                    <span>${field.label}</span>
                    <span class="bonus-pct-wrap">
                      <input
                        id="${field.id}"
                        class="input bonus-pct"
                        type="number"
                        min="0"
                        max="100"
                        value="${bonusSplit[field.key] ?? 0}"
                        data-key="${field.key}"
                      />
                      %
                    </span>
                  </label>
                `).join('')}
              </div>
              ${totalBonusPct !== 100 ? `<p class="bonus-warn">Total persen ${totalBonusPct}%, seharusnya 100%.</p>` : ''}
              <div class="bonus-amounts">
                ${BONUS_FIELDS.map((field) => `
                  <span class="chip">
                    ${field.label} ${formatIDR(amounts[field.key] ?? 0)}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="lifestyle-row" style="margin-top: 14px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <label for="lifestyle-choice" class="small" style="font-weight: 500;">${translate('allowance.lifestyle', lang)}</label>
          <select id="lifestyle-choice" class="input" style="max-width: 260px;" aria-label="${translate('allowance.lifestyle', lang)}">
            <option value="">${translate('allowance.lifestyleChoose', lang)}</option>
            ${LIFESTYLES.map((item) => `
              <option value="${item.id}"${lifestyleChoice === item.id ? ' selected' : ''}>
                ${item.name} - ${item.blurb}
              </option>
            `).join('')}
          </select>
          <button type="button" class="btn btn-sm btn-apply-lifestyle" ${!lifestyleChoice ? 'disabled' : ''}>
            ${translate('allowance.apply', lang)}
          </button>
        </div>
        ${s.lifestyle && s.lifestyle !== 'seimbang' ? `
          <p class="muted small" style="margin: 6px 0 0 0;">
            Gaya hidup aktif: <strong>${escapeHtml(findLifestyle(s.lifestyle).name)}</strong> (diterapkan ulang saat ganti profil alokasi).
          </p>
        ` : ''}

        ${isLifestyleOpen ? `
          <div class="lifestyle-modal overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div class="card lifestyle-card" style="max-width: 400px; width: 90%; background: var(--surface); padding: 20px; border-radius: 12px; box-shadow: var(--shadow-lg);">
              <h3 style="margin-top: 0;">${isEn ? 'Choose Lifestyle' : 'Pilih Gaya Hidup'}</h3>
              <div class="lifestyle-options" style="display: flex; flex-direction: column; gap: 8px; margin: 16px 0;">
                ${LIFESTYLES.map((ls) => `
                  <button type="button" class="btn ${selectedLifestyle === ls.id ? 'btn-primary' : 'btn-ghost'} lifestyle-option-btn" data-id="${ls.id}" style="text-align: left; justify-content: flex-start; padding: 10px 14px;">
                    <div>
                      <div><strong>${ls.name}</strong></div>
                      <div class="muted small">${ls.blurb}</div>
                    </div>
                  </button>
                `).join('')}
              </div>
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button type="button" class="btn btn-ghost btn-sm btn-cancel-lifestyle">${isEn ? 'Cancel' : 'Batal'}</button>
                <button type="button" class="btn btn-primary btn-sm btn-save-lifestyle">${isEn ? 'Apply' : 'Terapkan'}</button>
              </div>
            </div>
          </div>
        ` : ''}

        ${s.allowance > 0 && mode ? `
          <p class="muted small" style="margin: 8px 0 12px;">
            ${isEn ? 'Equiv.' : 'Setara'} ${formatIDR(derived.daily)}/${isEn ? 'day' : 'hari'} · ${formatIDR(derived.weekly)}/${isEn ? 'week' : 'minggu'} · ${formatIDR(derived.monthly)}/${isEn ? 'month' : 'bulan'}
          </p>

          <div class="safe" role="region" aria-label="Status anggaran belanja hari ini">
            <div class="safe-header-row">
              <span class="safe-label">${translate('allowance.safeSpend', lang)}</span>
              <span class="chip">
                ${derived.period ? (isEn ? `Day ${derived.elapsedDays + 1}` : `Hari ke-${derived.elapsedDays + 1}`) : (isEn ? 'Today' : 'Hari ini')}
              </span>
            </div>
            <strong class="safe-value">${formatIDR(derived.safeToSpend)}</strong>
            <div class="safe-sub-row">
              <span class="muted small">
                ${isEn ? 'Remaining' : 'Sisa'} <strong class="tabular-nums" style="color: var(--text);">${formatIDR(derived.remainingInPeriod)}</strong> ${isEn ? 'of' : 'dari'} ${formatIDR(budget)} ${isEn ? 'for this period' : 'untuk periode ini'}
              </span>
            </div>
            <div class="progress-bar-track" style="width: 100%; height: 10px; background: var(--bg-surface-soft, rgba(0,0,0,0.06)); border-radius: 999px; overflow: hidden; margin: 10px 0;">
              <div class="progress-bar-fill" style="width: ${pctUsed}%; height: 100%; background: var(--accent); border-radius: 999px;"></div>
            </div>
            <div class="safe-footer-meta muted small">
              <span>${translate('allowance.spent', lang)}: <strong class="tabular-nums">${formatIDR(derived.spentInPeriod)}</strong> (${pctUsed}%)</span>
              <span>${translate('allowance.remaining', lang)}: <strong class="tabular-nums">${formatIDR(derived.remainingInPeriod)}</strong></span>
            </div>
          </div>

          ${late ? `
            <div class="late-card" style="margin-top: 14px;">
              <header>
                <strong>${translate('allowance.lateTitle', lang)}</strong>
                <span class="chip">${isEn ? 'Remaining' : 'Sisa'} ${formatIDR(late.remaining)}</span>
              </header>
              <p class="muted small">${escapeHtml(late.text)}</p>
              <ul class="late-changes">
                ${late.changes.map((change) => `
                  <li>${escapeHtml(change.name)}: ${pctText(change.before)} → <strong>${pctText(change.after)}</strong></li>
                `).join('')}
              </ul>
              <button type="button" class="btn btn-sm btn-apply-late">${translate('allowance.applyLate', lang)}</button>
            </div>
          ` : ''}

          <h3 class="section-title" style="margin-top: 16px;">${translate('allowance.allocResult', lang)}</h3>
          <div class="wallet-grid alloc-cards">
            ${s.categories
              .filter((cat) => cat.ratio > 0 || cat.id === zeroPending)
              .map((cat) => `
                <article class="wallet" style="--wallet-color: ${escapeHtml(cat.color)};">
                  <header>
                    <span class="wallet-dot"></span>
                    <h3>${escapeHtml(cat.name)}</h3>
                  </header>
                  <input
                    type="text"
                    inputmode="numeric"
                    class="input alloc-val-input"
                    id="alloc-${escapeHtml(cat.id)}"
                    data-id="${escapeHtml(cat.id)}"
                    value="${cat.id === zeroPending ? '' : roundTo500(s.allowance * cat.ratio).toLocaleString('id-ID')}"
                    style="width: 100%;"
                  />
                  <p class="muted small">${pctText(cat.ratio)} ${translate('allowance.fromPocket', lang)}</p>
                </article>
              `).join('')}
          </div>
          <p class="muted small">
            ${isEn ? 'Total allocation' : 'Total alokasi'} = ${formatIDR(s.allowance)} (${Math.round(totalRatio * 100)}% ${isEn ? 'of pocket money' : 'dari uang jajan'}).
          </p>
          ${Math.abs(totalRatio - 1) > 0.0005 ? `
            <p class="bonus-warn">${isEn ? `Total allocation percent ${pctText(totalRatio)}, should be 100%.` : `Total persen alokasi ${pctText(totalRatio)}, seharusnya 100%.`}</p>
          ` : ''}

          ${!editing ? `
            <button type="button" class="btn btn-ghost btn-sm btn-open-alloc-editor">${translate('allowance.editAlloc', lang)}</button>
          ` : ''}
        ` : ''}

        <div class="alloc-editor-slot"></div>
      </section>
    `;

    bindEvents();

    if (editing) {
      const editorSlot = container.querySelector('.alloc-editor-slot');
      if (editorSlot) {
        renderAllocationEditor(editorSlot, {
          state: s,
          update,
          onDone: () => setEditing(false),
          lang,
        });
      }
    }
  }

  function bindEvents() {
    container.querySelector('#btn-change-period')?.addEventListener('click', () => {
      onChangePeriod?.();
    });

    const allowanceInput = container.querySelector('#allowance');
    if (allowanceInput) {
      bindMoneyInput(allowanceInput, (val) => {
        update((s) => ({
          ...s,
          allowance: val,
          categories: val > 0 ? roundAllocationCategories(s.categories, val) : s.categories,
        }));
      });
    }

    container.querySelector('.btn-toggle-var')?.addEventListener('click', () => {
      const s = getCurrentState();
      const nextVar = !s.incomeVar;
      update((prev) => ({
        ...prev,
        incomeVar: nextVar,
        allowanceMax: nextVar && prev.allowanceMax <= 0 ? prev.allowance : prev.allowanceMax,
      }));
    });

    const maxInput = container.querySelector('#allowance-max');
    if (maxInput) {
      bindMoneyInput(maxInput, (val) => {
        update((s) => ({ ...s, allowanceMax: val }));
      });
    }

    container.querySelectorAll('.bonus-pct').forEach((input) => {
      input.addEventListener('input', (e) => {
        const key = e.target.getAttribute('data-key');
        const raw = Number(e.target.value);
        if (!key) return;
        update((s) => ({
          ...s,
          bonusSplit: {
            ...s.bonusSplit,
            [key]: Math.min(100, Math.max(0, raw)),
          },
        }));
      });
    });

    // Lifestyle dropdown
    const lsSelect = container.querySelector('#lifestyle-choice');
    lsSelect?.addEventListener('change', (e) => {
      lifestyleChoice = e.target.value;
      container._allocLifestyleChoice = lifestyleChoice;
      const applyBtn = container.querySelector('.btn-apply-lifestyle');
      if (applyBtn) applyBtn.disabled = !lifestyleChoice;
    });

    container.querySelector('.btn-apply-lifestyle')?.addEventListener('click', () => {
      if (!lifestyleChoice) return;
      update((s) => {
        const styled = applyLifestyle(s.categories, lifestyleChoice);
        return {
          ...s,
          lifestyle: lifestyleChoice,
          categories: s.allowance > 0 ? roundAllocationCategories(styled, s.allowance) : styled,
        };
      });
      lifestyleChoice = '';
      container._allocLifestyleChoice = '';
      render();
    });

    // Lifestyle modal
    container.querySelector('.btn-open-lifestyle')?.addEventListener('click', () => {
      isLifestyleOpen = true;
      container._lifestyleModalOpen = true;
      selectedLifestyle = getCurrentState().lifestyle || 'seimbang';
      container._selectedLifestyle = selectedLifestyle;
      render();
    });

    container.querySelectorAll('.lifestyle-option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedLifestyle = btn.getAttribute('data-id') || 'seimbang';
        container._selectedLifestyle = selectedLifestyle;
        render();
      });
    });

    container.querySelector('.btn-cancel-lifestyle')?.addEventListener('click', () => {
      isLifestyleOpen = false;
      container._lifestyleModalOpen = false;
      render();
    });

    container.querySelector('.btn-save-lifestyle')?.addEventListener('click', () => {
      update((s) => {
        const styled = applyLifestyle(s.categories, selectedLifestyle);
        return {
          ...s,
          lifestyle: selectedLifestyle,
          categories: s.allowance > 0 ? roundAllocationCategories(styled, s.allowance) : styled,
        };
      });
      isLifestyleOpen = false;
      container._lifestyleModalOpen = false;
      render();
    });

    // Late period
    container.querySelector('.btn-apply-late')?.addEventListener('click', () => {
      const s = getCurrentState();
      const late = latePlan(s, derived);
      if (!late) return;
      update((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => {
          const ch = late.changes.find((item) => item.id === c.id);
          return ch ? { ...c, ratio: ch.after } : c;
        }),
      }));
      notify?.(isEn ? 'Allocation updated for the rest of the period.' : 'Alokasi diperbarui untuk sisa periode.');
    });

    // Allocation values
    container.querySelectorAll('.alloc-val-input').forEach((input) => {
      const catId = input.getAttribute('data-id');
      if (!catId) return;

      bindMoneyInput(input, (val) => {
        const s = getCurrentState();
        if (s.allowance <= 0) return;
        if (val <= 0) {
          zeroPending = catId;
          container._allocZeroPending = catId;
          return;
        }
        zeroPending = null;
        container._allocZeroPending = null;
        const ratio = val / s.allowance;
        update((prev) => ({
          ...prev,
          categories: prev.categories.map((c) => (c.id === catId ? { ...c, ratio } : c)),
        }));
      }, {
        onBlur: () => {
          if (zeroPending === catId) {
            zeroPending = null;
            container._allocZeroPending = null;
            update((prev) => ({
              ...prev,
              categories: prev.categories.map((c) => (c.id === catId ? { ...c, ratio: 0 } : c)),
            }));
          }
        },
      });
    });

    container.querySelector('.btn-open-alloc-editor')?.addEventListener('click', () => {
      setEditing(true);
    });
  }

  render();

  return {
    update(nextState, nextDerived) {
      currentState = nextState;
      if (nextDerived) derived = nextDerived;
      render();
    },
  };
}
