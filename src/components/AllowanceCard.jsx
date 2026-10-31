import { useState } from 'react';
import { formatIDR } from '../lib/money';
import { bonusAmounts, splitTotal } from '../lib/bonus';
import { latePlan } from '../lib/lateperiod';
import { LIFESTYLES, applyLifestyle, findLifestyle } from '../lib/lifestyles';
import { roundAllocationCategories, roundTo500 } from '../lib/allocation';
import { useI18n } from '../lib/i18n';
import { MoneyInput } from './MoneyInput';
import { ProgressBar } from './ProgressBar';
import { AllocationEditor } from './AllocationEditor';
import { CustomSelect } from './CustomSelect';
const LABEL = { week: '1 Minggu', month: '1 Bulan' };
const UNIT = { week: 'minggu', month: 'bulan' };
const pctText = (ratio) => `${String(Number((ratio * 100).toFixed(1))).replace('.', ',')}%`;
const BONUS_FIELDS = [
    { key: 'savings', label: 'Tabungan', id: 'bonus-savings' },
    { key: 'buffer', label: 'Dana darurat / target', id: 'bonus-buffer' },
    { key: 'fun', label: 'Keinginan', id: 'bonus-fun' },
];
export function AllowanceCard({ state, derived, update, notify, onChangePeriod }) {
    const { t, language } = useI18n();
    const mode = state.mode;
    const [editing, setEditing] = useState(false);
    const [lifestyleId, setLifestyleId] = useState('');
    const [zeroPending, setZeroPending] = useState(null);
    const varOn = state.incomeVar;
    const bonus = Math.max(0, state.allowanceMax - state.allowance);
    const total = splitTotal(state.bonusSplit);
    const amounts = bonusAmounts(bonus, state.bonusSplit);
    const late = latePlan(state, derived);
    const budget = state.allowance;
    const totalRatio = state.categories.reduce((sum, category) => sum + Math.max(0, category.ratio), 0);
    const toggleVar = () => update((s) => ({ ...s, incomeVar: !s.incomeVar }));
    const applyLifestyleChoice = () => {
        if (lifestyleId === '')
            return;
        update((s) => {
            const styled = applyLifestyle(s.categories, lifestyleId);
            return {
                ...s,
                lifestyle: lifestyleId,
                categories: s.allowance > 0 ? roundAllocationCategories(styled, s.allowance) : styled,
            };
        });
        setLifestyleId('');
    };
    const setAllocAmount = (id, value) => {
        if (state.allowance <= 0)
            return;
        if (value <= 0) {
            // jangan commit 0 saat mengetik: kartu akan hilang dari hasil alokasi
            setZeroPending(id);
            return;
        }
        setZeroPending(null);
        const ratio = value / state.allowance;
        update((s) => ({
            ...s,
            categories: s.categories.map((category) => (category.id === id ? { ...category, ratio } : category)),
        }));
    };
    const commitZeroAmount = (id) => {
        if (zeroPending !== id)
            return;
        setZeroPending(null);
        update((s) => ({
            ...s,
            categories: s.categories.map((category) => (category.id === id ? { ...category, ratio: 0 } : category)),
        }));
    };
    const setAllowance = (value) => update((s) => ({
        ...s,
        allowance: value,
        allowanceMax: s.allowanceMax > 0 ? Math.max(s.allowanceMax, value) : 0,
        categories: value > 0 ? roundAllocationCategories(s.categories, value) : s.categories,
    }));
    const setSplit = (key, raw) => update((s) => ({ ...s, bonusSplit: { ...s.bonusSplit, [key]: Math.min(100, Math.max(0, raw)) } }));
    const applyLatePlan = () => {
        if (!late)
            return;
        update((s) => ({
            ...s,
            categories: s.categories.map((category) => {
                const next = late.ratios[category.id];
                return next !== undefined && Math.abs(next - category.ratio) > 1e-9
                    ? { ...category, ratio: next }
                    : category;
            }),
        }));
        notify('Alokasi diperbarui untuk sisa periode.');
    };
    return (<section className="card">
      <header className="card-head">
        <h2>{t('allowance.title')}</h2>
        {mode && (<button type="button" className="btn btn-ghost btn-sm" onClick={onChangePeriod}>
            {mode === 'week' ? t('allowance.changeToMonth') : t('allowance.changeToWeek')}
          </button>)}
      </header>

      <div className="field">
        <label htmlFor="allowance">
          {t('allowance.totalPocket')} {mode ? `per ${mode === 'week' ? (language === 'en' ? 'week' : 'minggu') : (language === 'en' ? 'month' : 'bulan')}` : ''}
          {mode && <span className="chip">{mode === 'week' ? (language === 'en' ? '1 Week' : '1 Minggu') : (language === 'en' ? '1 Month' : '1 Bulan')}</span>}
        </label>
        <MoneyInput value={state.allowance} onValueChange={setAllowance} id="allowance"/>
      </div>

      <div className="bonus-block">
        <div className="bonus-row">
          <button type="button" className={`btn btn-ghost btn-sm${varOn ? ' btn-active' : ''}`} aria-pressed={varOn} onClick={toggleVar}>
            {t('allowance.variableIncome')}
          </button>
          <CustomSelect className="input" aria-label={t('allowance.lifestyle')} value={lifestyleId} onChange={(event) => setLifestyleId(event.target.value)} title="Pilih Gaya Hidup">
            <option value="">{t('allowance.lifestyleChoose')}</option>
            {LIFESTYLES.map((item) => (<option key={item.id} value={item.id}>
                {item.name}: {item.blurb}
              </option>))}
          </CustomSelect>
          <button type="button" className="btn btn-sm" disabled={lifestyleId === ''} onClick={applyLifestyleChoice}>
            {t('allowance.apply')}
          </button>
        </div>
        {state.lifestyle !== 'seimbang' && (<p className="muted small">
            Gaya hidup aktif: {findLifestyle(state.lifestyle).name} (diterapkan ulang saat ganti profil alokasi).
          </p>)}
        {varOn && (<p className="muted small">
            Semua hitungan (alokasi, per hari, sisa) pakai dasar {formatIDR(state.allowance)}. Batas atas hanya
            untuk skenario bonus.
          </p>)}
        {varOn && (<div className="field">
            <label htmlFor="allowance-max">
              Pemasukan tertinggi {mode ? `per ${UNIT[mode]}` : ''}
            </label>
            <MoneyInput id="allowance-max" value={state.allowanceMax} onValueChange={(value) => update((s) => ({ ...s, allowanceMax: Math.max(value, s.allowance) }))}/>
          </div>)}
        {varOn && bonus > 0 && (<div className="bonus-card">
            <header>
              <strong>Skenario bonus</strong>
              <span className="chip">Dasar {formatIDR(state.allowance)}</span>
            </header>
            <p className="muted small">
              Kalau dapat {formatIDR(state.allowanceMax)}, sisa{' '}
              <strong className="bonus-total">{formatIDR(bonus)}</strong> di atas dasar dibagi:
            </p>
            <div className="bonus-fields">
              {BONUS_FIELDS.map((field) => (<label key={field.key} className="bonus-field" htmlFor={field.id}>
                  <span>{field.label}</span>
                  <span className="bonus-pct-wrap">
                    <input id={field.id} className="input bonus-pct" type="number" min={0} max={100} value={state.bonusSplit[field.key]} onChange={(event) => setSplit(field.key, Number(event.target.value))}/>
                    %
                  </span>
                </label>))}
            </div>
            {total !== 100 && (<p className="bonus-warn">Total persen {total}%, seharusnya 100%.</p>)}
            <div className="bonus-amounts">
              {BONUS_FIELDS.map((field) => (<span key={field.key} className="chip">
                  {field.label} {formatIDR(amounts[field.key])}
                </span>))}
            </div>
          </div>)}
      </div>

      {state.allowance > 0 && mode && (<>
          <p className="muted small">
            {language === 'en' ? 'Equiv.' : 'Setara'} {formatIDR(derived.daily)}/{language === 'en' ? 'day' : 'hari'} · {formatIDR(derived.weekly)}/{language === 'en' ? 'week' : 'minggu'} · {formatIDR(derived.monthly)}/{language === 'en' ? 'month' : 'bulan'}
          </p>

          <div className="safe" role="region" aria-label="Status anggaran belanja hari ini">
            <div className="safe-header-row">
              <span className="safe-label">{t('allowance.safeSpend')}</span>
              <span className="chip">
                {derived.period ? (language === 'en' ? `Day ${derived.elapsedDays + 1}` : `Hari ke-${derived.elapsedDays + 1}`) : (language === 'en' ? 'Today' : 'Hari ini')}
              </span>
            </div>
            <strong className="safe-value">{formatIDR(derived.safeToSpend)}</strong>
            <div className="safe-sub-row">
              <span className="muted small">
                {language === 'en' ? 'Remaining' : 'Sisa'} <strong className="tabular-nums" style={{ color: 'var(--text)' }}>{formatIDR(derived.remainingInPeriod)}</strong> {language === 'en' ? 'of' : 'dari'} {formatIDR(budget)} {language === 'en' ? 'for this period' : 'untuk periode ini'}
              </span>
            </div>
            <ProgressBar value={derived.spentInPeriod} max={budget}/>
            <div className="safe-footer-meta muted small">
              <span>{t('allowance.spent')}: <strong className="tabular-nums">{formatIDR(derived.spentInPeriod)}</strong> ({Math.round(budget > 0 ? (derived.spentInPeriod / budget) * 100 : 0)}%)</span>
              <span>{t('allowance.remaining')}: <strong className="tabular-nums">{formatIDR(derived.remainingInPeriod)}</strong></span>
            </div>
          </div>

          {late && (<div className="late-card">
              <header>
                <strong>{t('allowance.lateTitle')}</strong>
                <span className="chip">{language === 'en' ? 'Remaining' : 'Sisa'} {formatIDR(late.remaining)}</span>
              </header>
              <p className="muted small">{late.text}</p>
              <ul className="late-changes">
                {late.changes.map((change) => (<li key={change.id}>
                    {change.name}: {pctText(change.before)} → <strong>{pctText(change.after)}</strong>
                  </li>))}
              </ul>
              {late.shortfall > 0 && (<p className="text-danger small">
                  {language === 'en'
                        ? `Remaining days need ${formatIDR(late.shortfall)} more. Hold savings until next period.`
                        : `Kebutuhan sisa hari masih kurang ${formatIDR(late.shortfall)}. Tahan menabung dulu sampai periode berikutnya.`}
                </p>)}
              <button type="button" className="btn btn-sm" onClick={applyLatePlan}>
                {t('allowance.applyLate')}
              </button>
            </div>)}

          <h3 className="section-title">{t('allowance.allocResult')}</h3>
          <div className="wallet-grid alloc-cards">
            {state.categories
                .filter((category) => category.ratio > 0)
                .map((category) => {
                return (<article key={category.id} className="wallet" style={{ '--wallet-color': category.color }}>
                    <header>
                      <span className="wallet-dot"/>
                      <h3>{category.name}</h3>
                    </header>
                    <MoneyInput id={`alloc-${category.id}`} value={roundTo500(state.allowance * category.ratio)} disabled={state.allowance <= 0} onValueChange={(value) => setAllocAmount(category.id, value)} onBlur={() => commitZeroAmount(category.id)}/>
                    <p className="muted small">{pctText(category.ratio)} {t('allowance.fromPocket')}</p>
                  </article>);
            })}
          </div>
          <p className="muted small">
            {language === 'en' ? 'Total allocation' : 'Total alokasi'} = {formatIDR(state.allowance)} ({Math.round(totalRatio * 100)}% {language === 'en' ? 'of pocket money' : 'dari uang jajan'}{' '}
            {LABEL[mode ?? 'week'].toLowerCase()}).
          </p>
          {Math.abs(totalRatio - 1) > 0.0005 && (<p className="bonus-warn">{language === 'en' ? `Total allocation percent ${pctText(totalRatio)}, should be 100%.` : `Total persen alokasi ${pctText(totalRatio)}, seharusnya 100%.`}</p>)}

          {!editing && (<button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              {t('allowance.editAlloc')}
            </button>)}

          {editing && <AllocationEditor state={state} update={update} onDone={() => setEditing(false)}/>}
        </>)}
    </section>);
}
