/**
 * Allocation Ratio Editor (Pure Vanilla JS)
 */
import { CATEGORY_COLORS, categoryKind } from '../lib/state.js';
import { PROFILES, applyProfile, findProfile } from '../lib/profiles.js';
import { applyLifestyle } from '../lib/lifestyles.js';
import { roundAllocationCategories } from '../lib/allocation.js';
import { uid } from '../lib/id.js';
import { escapeHtml } from '../lib/dom.js';

const pctOf = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const fmtPct = (value) => String(Math.round(value * 10) / 10);
const sumText = (value) => fmtPct(value).replace('.', ',');

function buildRows(state) {
  const defOptional = new Map();
  for (const profile of PROFILES) {
    for (const entry of profile.ratios) defOptional.set(entry.id, Boolean(entry.optional));
  }

  const rows = state.categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    optional: Boolean(category.optional) || Boolean(defOptional.get(category.id)),
    builtin: category.builtin,
    kind: categoryKind(category),
  }));
  const ids = new Set(rows.map((row) => row.id));
  const names = new Set(rows.map((row) => row.name.trim().toLowerCase()));

  PROFILES.forEach((profile) => {
    profile.ratios.forEach((entry, index) => {
      if (ids.has(entry.id) || names.has(entry.name.toLowerCase())) return;
      rows.push({
        id: entry.id,
        name: entry.name,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        optional: Boolean(entry.optional),
        builtin: true,
        kind: categoryKind({ id: entry.id }),
      });
      ids.add(entry.id);
      names.add(entry.name.toLowerCase());
    });
  });
  return rows;
}

export function renderAllocationEditor(container, { state, update, onDone, lang = 'id' }) {
  if (!container) return;
  const isEn = lang === 'en';

  const rows = buildRows(state);
  const byId = new Map(state.categories.map((category) => [category.id, category]));
  const draft = Object.fromEntries(
    rows.map((row) => {
      const category = byId.get(row.id);
      const pct = category ? (category.off ? (category.baseRatio ?? 0) * 100 : category.ratio * 100) : 0;
      return [row.id, fmtPct(pct)];
    })
  );
  const off = Object.fromEntries(
    state.categories.filter((category) => category.off).map((category) => [category.id, true])
  );
  let newName = '';

  const activeProfile = findProfile(state.profile);
  const otherProfile = PROFILES.find((profile) => profile.id !== state.profile) ?? PROFILES[0];
  const otherMap = new Map(otherProfile.ratios.map((entry) => [entry.id, entry.ratio * 100]));
  const otherSum = otherProfile.ratios.reduce((total, entry) => total + entry.ratio, 0) * 100;

  function pct(id) {
    return pctOf(draft[id] ?? '0');
  }

  function scaleOthers(exceptId, factor) {
    for (const row of rows) {
      if (row.id === exceptId || off[row.id]) continue;
      draft[row.id] = fmtPct(pctOf(draft[row.id] ?? '0') * factor);
    }
  }

  function toggleOff(row) {
    const value = pct(row.id);
    if (off[row.id]) {
      const factor = (100 - value) / 100;
      if (factor > 0) scaleOthers(row.id, factor);
      delete off[row.id];
    } else {
      if (value < 100) scaleOthers(row.id, 100 / (100 - value));
      off[row.id] = true;
    }
    render();
  }

  function autoBalance() {
    const activeRows = rows.filter((r) => !off[r.id]);
    if (activeRows.length === 0) return;

    const currentTotal = activeRows.reduce((sum, r) => sum + pct(r.id), 0);
    if (currentTotal <= 0) {
      const equalShare = Math.floor((100 / activeRows.length) * 10) / 10;
      const remainder = Math.round((100 - equalShare * activeRows.length) * 10) / 10;
      activeRows.forEach((r, idx) => {
        draft[r.id] = fmtPct(equalShare + (idx === 0 ? remainder : 0));
      });
      render();
      return;
    }

    const factor = 100 / currentTotal;
    let distributed = 0;
    const calculated = [];

    activeRows.forEach((r) => {
      const scaled = Math.round(pct(r.id) * factor * 10) / 10;
      calculated.push({ id: r.id, val: scaled });
      distributed += scaled;
    });

    const delta = Math.round((100 - distributed) * 10) / 10;
    if (Math.abs(delta) > 0.01 && calculated.length > 0) {
      let maxIdx = 0;
      calculated.forEach((c, idx) => {
        if (c.val > calculated[maxIdx].val) maxIdx = idx;
      });
      calculated[maxIdx].val = Math.round((calculated[maxIdx].val + delta) * 10) / 10;
    }

    calculated.forEach((c) => {
      draft[c.id] = fmtPct(c.val);
    });
    render();
  }

  function addRow() {
    const name = newName.trim();
    if (name === '' || rows.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())) return;
    const row = {
      id: uid('cat'),
      name,
      color: CATEGORY_COLORS[rows.length % CATEGORY_COLORS.length],
      optional: false,
      builtin: false,
      kind: 'harian',
    };
    rows.push(row);
    draft[row.id] = '0';
    newName = '';
    render();
  }

  function save() {
    const activeSum = rows.reduce((total, row) => (off[row.id] ? total : total + pct(row.id)), 0);
    const sumOk = Math.abs(activeSum - 100) <= 0.1;
    if (!sumOk || activeSum <= 0) return;
    update((s) => {
      const byIdMap = new Map(s.categories.map((category) => [category.id, category]));
      const categories = rows.map((row) => {
        const isOff = Boolean(off[row.id]);
        const raw = pct(row.id);
        const previous = byIdMap.get(row.id);
        return {
          id: row.id,
          name: row.name,
          ratio: isOff ? 0 : raw / activeSum,
          builtin: row.builtin,
          color: previous?.color ?? row.color,
          kind: row.kind,
          ...(row.optional ? { optional: true } : {}),
          ...(isOff ? { off: true, baseRatio: raw / 100 } : {}),
        };
      });
      const rounded = s.allowance > 0 ? roundAllocationCategories(categories, s.allowance) : categories;
      return { ...s, categories: rounded };
    });
    onDone?.();
  }

  function reset() {
    const refreshed = applyLifestyle(applyProfile(state.categories, findProfile(state.profile)), state.lifestyle);
    const refreshedMap = new Map(refreshed.map((category) => [category.id, category]));
    rows.forEach((row) => {
      const category = refreshedMap.get(row.id);
      if (category) draft[row.id] = fmtPct(category.ratio * 100);
      delete off[row.id];
    });
    render();
  }

  function render() {
    const activeSum = rows.reduce((total, row) => (off[row.id] ? total : total + pct(row.id)), 0);
    const sumOk = Math.abs(activeSum - 100) <= 0.1;
    const remaining = Math.round((100 - activeSum) * 10) / 10;

    const existing = container.querySelector('.alloc-edit');
    const existingRows = existing ? existing.querySelectorAll('tbody tr[data-id]') : [];

    if (existing && existingRows.length === rows.length) {
      // In-place update to preserve DOM elements and references
      const banner = existing.querySelector('.alloc-status-banner');
      if (banner) {
        banner.className = `alloc-status-banner ${sumOk ? 'status-ok' : remaining > 0 ? 'status-under' : 'status-over'}`;
        const pctEl = banner.querySelector('.alloc-status-pct');
        if (pctEl) pctEl.textContent = `${sumText(activeSum)}%`;
        const badgeEl = banner.querySelector('.alloc-status-badge');
        if (badgeEl) {
          badgeEl.textContent = sumOk
            ? (isEn ? 'Exact 100%' : 'Pas 100%')
            : remaining > 0
            ? (isEn ? `Remaining ${sumText(remaining)}% unallocated` : `Sisa ${sumText(remaining)}% belum dialokasikan`)
            : (isEn ? `Excess ${sumText(Math.abs(remaining))}% over 100%` : `Kelebihan ${sumText(Math.abs(remaining))}% dari 100%`);
        }
        let autoBtn = banner.querySelector('.alloc-autobalance-btn');
        if (!sumOk && !autoBtn) {
          autoBtn = document.createElement('button');
          autoBtn.type = 'button';
          autoBtn.className = 'btn btn-sm btn-ghost alloc-autobalance-btn';
          autoBtn.textContent = isEn ? 'Auto Balance' : 'Seimbangkan Otomatis';
          autoBtn.addEventListener('click', autoBalance);
          banner.appendChild(autoBtn);
        } else if (sumOk && autoBtn) {
          autoBtn.remove();
        }
      }

      rows.forEach((row) => {
        const tr = existing.querySelector(`tbody tr[data-id="${row.id}"]`);
        if (tr) {
          const isOff = Boolean(off[row.id]);
          tr.className = isOff ? 'alloc-off' : '';
          const input = tr.querySelector('.alloc-pct-input');
          if (input && document.activeElement !== input) {
            input.value = draft[row.id] ?? '0';
          }
          if (input) {
            input.disabled = isOff;
          }
          const chk = tr.querySelector('.alloc-opt-checkbox');
          if (chk) {
            chk.checked = !isOff;
          }
          const reduceBtn = tr.querySelector('.btn-reduce-row');
          if (reduceBtn) {
            reduceBtn.disabled = isOff || pct(row.id) === 0;
          }
        }
      });

      const totalTrs = existing.querySelectorAll('tbody tr.alloc-total');
      if (totalTrs.length >= 2) {
        const tdActive = totalTrs[0].querySelectorAll('td')[1];
        if (tdActive) tdActive.textContent = `${sumText(activeSum)}%`;

        const tdCheck = totalTrs[1].querySelectorAll('td')[1];
        if (tdCheck) {
          tdCheck.innerHTML = `<span class="${sumOk ? 'alloc-check alloc-check-ok' : 'alloc-check text-danger'}">${sumOk ? 'OK' : isEn ? 'NOT YET' : 'BELUM'}</span>`;
        }
      }

      const addInp = existing.querySelector('.alloc-add input');
      if (addInp && document.activeElement !== addInp) addInp.value = newName;
      const addBtn = existing.querySelector('.btn-add-cat');
      if (addBtn) addBtn.disabled = newName.trim() === '';

      const saveBtn = existing.querySelector('.btn-save-alloc');
      if (saveBtn) saveBtn.disabled = !sumOk;

      return;
    }

    container.innerHTML = `
      <div class="alloc-edit">
        <div class="alloc-status-banner ${sumOk ? 'status-ok' : remaining > 0 ? 'status-under' : 'status-over'}">
          <div class="alloc-status-info">
            <span class="alloc-status-label">
              ${isEn ? 'Running Allocation Total:' : 'Total Alokasi Berjalan:'}
            </span>
            <strong class="alloc-status-pct">${sumText(activeSum)}%</strong>
            <span class="alloc-status-badge">
              ${sumOk
                ? isEn
                  ? 'Exact 100%'
                  : 'Pas 100%'
                : remaining > 0
                ? isEn
                  ? `Remaining ${sumText(remaining)}% unallocated`
                  : `Sisa ${sumText(remaining)}% belum dialokasikan`
                : isEn
                  ? `Excess ${sumText(Math.abs(remaining))}% over 100%`
                  : `Kelebihan ${sumText(Math.abs(remaining))}% dari 100%`}
            </span>
          </div>
          ${!sumOk ? `
            <button
              type="button"
              class="btn btn-sm btn-ghost alloc-autobalance-btn"
              title="${isEn ? 'Balance all percentages proportionally to exact 100%' : 'Seimbangkan semua persen secara proporsional agar tepat 100%'}"
            >${isEn ? 'Auto Balance' : 'Seimbangkan Otomatis'}</button>
          ` : ''}
        </div>

        <div class="alloc-table-wrap">
          <table class="alloc-table">
            <thead>
              <tr>
                <th>${isEn ? 'Category' : 'Kategori'}</th>
                <th class="alloc-col-active">${escapeHtml(activeProfile.label)}</th>
                <th>${escapeHtml(otherProfile.label)}</th>
                <th>${isEn ? 'Optional?' : 'Opsional?'}</th>
                <th>${isEn ? 'Type' : 'Jenis'}</th>
                <th>${isEn ? 'Action' : 'Aksi'}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((row) => {
                const isOff = Boolean(off[row.id]);
                const other = otherMap.get(row.id);
                return `
                  <tr class="${isOff ? 'alloc-off' : ''}" data-id="${escapeHtml(row.id)}">
                    <td>
                      <span class="alloc-cat">
                        <span class="alloc-dot" style="background: ${escapeHtml(row.color)};"></span>
                        ${escapeHtml(row.name)}
                      </span>
                    </td>
                    <td>
                      <input
                        class="input alloc-pct-input"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        inputmode="decimal"
                        value="${escapeHtml(draft[row.id] ?? '0')}"
                        ${isOff ? 'disabled' : ''}
                        aria-label="Persen ${escapeHtml(row.name)}"
                        data-id="${escapeHtml(row.id)}"
                      />
                    </td>
                    <td class="alloc-pct-static">${other === undefined ? '-' : `${fmtPct(other)}%`}</td>
                    <td class="alloc-toggle-cell">
                      ${row.optional ? `
                        <input
                          type="checkbox"
                          ${!isOff ? 'checked' : ''}
                          aria-label="Opsional ${escapeHtml(row.name)}"
                          data-id="${escapeHtml(row.id)}"
                          class="alloc-opt-checkbox"
                        />
                      ` : `
                        <span class="alloc-pct-static">${isEn ? 'No' : 'Tidak'}</span>
                      `}
                    </td>
                    <td>
                      <select
                        class="input alloc-kind"
                        aria-label="Jenis ${escapeHtml(row.name)}"
                        data-id="${escapeHtml(row.id)}"
                        title="Pilih Jenis Kategori ${escapeHtml(row.name)}"
                      >
                        <option value="harian"${row.kind === 'harian' ? ' selected' : ''}>${isEn ? 'Daily' : 'Harian'}</option>
                        <option value="keinginan"${row.kind === 'keinginan' ? ' selected' : ''}>${isEn ? 'Wants' : 'Keinginan'}</option>
                        <option value="tabungan"${row.kind === 'tabungan' ? ' selected' : ''}>${isEn ? 'Savings' : 'Tabungan'}</option>
                      </select>
                    </td>
                    <td class="alloc-action-cell">
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm btn-reduce-row"
                        aria-label="Kurangi alokasi ${escapeHtml(row.name)}"
                        data-id="${escapeHtml(row.id)}"
                        ${isOff || pct(row.id) === 0 ? 'disabled' : ''}
                      >${isEn ? 'Reduce' : 'Kurangi'}</button>
                    </td>
                  </tr>
                `;
              }).join('')}
              <tr class="alloc-total">
                <td>Total</td>
                <td>${sumText(activeSum)}%</td>
                <td>${sumText(otherSum)}%</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr class="alloc-total">
                <td>${isEn ? '100% Check' : 'Cek 100%'}</td>
                <td><span class="${sumOk ? 'alloc-check alloc-check-ok' : 'alloc-check text-danger'}">${sumOk ? 'OK' : isEn ? 'NOT YET' : 'BELUM'}</span></td>
                <td class="alloc-check alloc-check-ok">${Math.abs(otherSum - 100) <= 0.1 ? 'OK' : isEn ? 'NOT YET' : 'BELUM'}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="alloc-add">
          <input
            class="input"
            type="text"
            placeholder="${isEn ? 'New category name' : 'Nama kategori baru'}"
            value="${escapeHtml(newName)}"
            aria-label="${isEn ? 'New category name' : 'Nama kategori baru'}"
          />
          <button type="button" class="btn btn-ghost btn-sm btn-add-cat" ${newName.trim() === '' ? 'disabled' : ''}>${isEn ? '+ Add category' : '+ Tambah kategori'}</button>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-sm btn-save-alloc" ${!sumOk ? 'disabled' : ''}>${isEn ? 'Save allocation' : 'Simpan alokasi'}</button>
          <button type="button" class="btn btn-ghost btn-sm btn-reset-alloc">${isEn ? 'Reset to default' : 'Reset ke default'}</button>
          <button type="button" class="btn btn-ghost btn-sm btn-cancel-alloc">${isEn ? 'Cancel' : 'Batal'}</button>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const root = container.querySelector('.alloc-edit');
    if (!root) return;

    root.querySelector('.alloc-autobalance-btn')?.addEventListener('click', autoBalance);

    root.querySelectorAll('.alloc-pct-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const id = input.dataset.id;
        draft[id] = e.target.value;
        const activeSum = rows.reduce((total, row) => (off[row.id] ? total : total + pct(row.id)), 0);
        const sumOk = Math.abs(activeSum - 100) <= 0.1;
        const remaining = Math.round((100 - activeSum) * 10) / 10;

        const banner = root.querySelector('.alloc-status-banner');
        if (banner) {
          banner.className = `alloc-status-banner ${sumOk ? 'status-ok' : remaining > 0 ? 'status-under' : 'status-over'}`;
        }
        const pctEl = root.querySelector('.alloc-status-pct');
        if (pctEl) pctEl.textContent = `${sumText(activeSum)}%`;
        const badgeEl = root.querySelector('.alloc-status-badge');
        if (badgeEl) {
          badgeEl.textContent = sumOk
            ? (isEn ? 'Exact 100%' : 'Pas 100%')
            : remaining > 0
            ? (isEn ? `Remaining ${sumText(remaining)}% unallocated` : `Sisa ${sumText(remaining)}% belum dialokasikan`)
            : (isEn ? `Excess ${sumText(Math.abs(remaining))}% over 100%` : `Kelebihan ${sumText(Math.abs(remaining))}% dari 100%`);
        }
        const checkEl = root.querySelector('.alloc-total .alloc-check');
        if (checkEl) {
          checkEl.className = sumOk ? 'alloc-check alloc-check-ok' : 'alloc-check text-danger';
          checkEl.textContent = sumOk ? 'OK' : (isEn ? 'NOT YET' : 'BELUM');
        }
        const saveBtn = root.querySelector('.btn-save-alloc');
        if (saveBtn) saveBtn.disabled = !sumOk;
      });
    });

    root.querySelectorAll('.alloc-opt-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const id = checkbox.dataset.id;
        const row = rows.find((r) => r.id === id);
        if (row) toggleOff(row);
      });
    });

    root.querySelectorAll('.alloc-kind').forEach((select) => {
      select.addEventListener('change', (e) => {
        const id = select.dataset.id;
        const row = rows.find((r) => r.id === id);
        if (row) row.kind = e.target.value;
      });
    });

    root.querySelectorAll('.btn-reduce-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        draft[id] = '0';
        render();
      });
    });

    const addInput = root.querySelector('.alloc-add input');
    addInput?.addEventListener('input', (e) => {
      newName = e.target.value;
      const addBtn = root.querySelector('.btn-add-cat');
      if (addBtn) addBtn.disabled = newName.trim() === '';
    });

    root.querySelector('.btn-add-cat')?.addEventListener('click', addRow);
    root.querySelector('.btn-save-alloc')?.addEventListener('click', save);
    root.querySelector('.btn-reset-alloc')?.addEventListener('click', reset);
    root.querySelector('.btn-cancel-alloc')?.addEventListener('click', onDone);
  }

  render();
}
