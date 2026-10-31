import { useMemo, useState } from 'react';
import { categoryDeltas, shiftMonthKey, summarizeMonth } from '../lib/compare';
import { formatIDR, monthKey, monthLabel, toISO } from '../lib/money';
import { useI18n } from '../lib/i18n';
import { ICON_DELTA_UP, ICON_DELTA_DOWN } from './icons';
function Delta({ value, isEn }) {
    if (value === null)
        return <span className="delta">{isEn ? 'new' : 'baru'}</span>;
    if (value === 0)
        return <span className="delta delta-flat">0%</span>;
    return (<span className={`delta ${value > 0 ? 'delta-up' : 'delta-down'}`}>
      {value > 0 ? ICON_DELTA_UP : ICON_DELTA_DOWN}
      <span>{Math.abs(value)}%</span>
    </span>);
}
export function MonthCompare({ state, derived }) {
    const { language } = useI18n();
    const isEn = language === 'en';
    const [currentKey] = useState(() => monthKey(toISO(new Date())));
    const previousKey = useMemo(() => shiftMonthKey(currentKey, -1), [currentKey]);
    const current = useMemo(() => summarizeMonth(derived.allIncomes, state.expenses, currentKey), [derived.allIncomes, state.expenses, currentKey]);
    const previous = useMemo(() => summarizeMonth(derived.allIncomes, state.expenses, previousKey), [derived.allIncomes, state.expenses, previousKey]);
    const deltas = useMemo(() => categoryDeltas(state.expenses, state.categories, currentKey, previousKey), [state.expenses, state.categories, currentKey, previousKey]);
    const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? null : 0);
    return (<section className="card">
      <header className="card-head">
        <h2>{isEn ? 'This Month vs Last Month' : 'Bulan Ini vs Bulan Lalu'}</h2>
        <span className="muted small">{monthLabel(currentKey)}</span>
      </header>

      <div className="compare-grid">
        <div className="compare">
          <span className="muted small">{isEn ? 'Income' : 'Pemasukan'}</span>
          <strong>{formatIDR(current.income)}</strong>
          <Delta value={pct(current.income, previous.income)} isEn={isEn}/>
        </div>
        <div className="compare">
          <span className="muted small">{isEn ? 'Expenses' : 'Pengeluaran'}</span>
          <strong>{formatIDR(current.expense)}</strong>
          <Delta value={pct(current.expense, previous.expense)} isEn={isEn}/>
        </div>
        <div className="compare">
          <span className="muted small">
            {isEn ? 'Net (income − expenses)' : 'Sisa (pemasukan − pengeluaran)'}
          </span>
          <strong className={current.net < 0 ? 'text-danger' : ''}>{formatIDR(current.net)}</strong>
          <Delta value={pct(current.net, previous.net)} isEn={isEn}/>
        </div>
      </div>

      <h3 className="section-title">{isEn ? 'By category' : 'Per kategori'}</h3>
      <ul className="delta-list">
        {deltas.map((item) => (<li key={item.category.id}>
            <span className="alloc-dot" style={{ background: item.category.color }}/>
            <span className="alloc-name">{item.category.name}</span>
            <span className="muted small">{formatIDR(item.current)}</span>
            <Delta value={item.changePct} isEn={isEn}/>
          </li>))}
        {deltas.length === 0 && (<li className="empty">{isEn ? 'No comparison data yet.' : 'Belum ada pembanding.'}</li>)}
      </ul>
    </section>);
}
