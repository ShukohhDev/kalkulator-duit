import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { buildCashflow } from '../lib/derive';
import { CHART_FONT, EXPENSE_COLOR, MUTED_COLOR } from '../lib/chartSetup';
import { loadPrefs, savePrefs } from '../lib/prefs';
import { formatIDR } from '../lib/money';
import { nowDate } from '../lib/obligations';
import { useI18n } from '../lib/i18n';
import { CustomSelect } from './CustomSelect';
export function TrendPanel({ state }) {
    const { language } = useI18n();
    const isEn = language === 'en';
    const views = useMemo(() => [
        { id: 'day', label: isEn ? 'Daily' : 'Harian' },
        { id: 'week', label: isEn ? 'Weekly' : 'Mingguan' },
        { id: 'month', label: isEn ? 'Monthly' : 'Bulanan' },
        { id: 'year', label: isEn ? 'Yearly' : 'Tahunan' },
    ], [isEn]);
    const trendCategories = useMemo(() => {
        const expenseCatIds = new Set(state.expenses.map((e) => e.categoryId));
        const list = state.categories.filter((c) => (c.ratio > 0 && !c.off) || expenseCatIds.has(c.id));
        return list.length > 0 ? list : state.categories;
    }, [state.categories, state.expenses]);
    const [categoryId, setCategoryId] = useState(() => {
        const firstAllocated = state.categories.find((c) => c.ratio > 0 && !c.off);
        return firstAllocated?.id ?? state.categories[0]?.id ?? 'makan';
    });
    useEffect(() => {
        if (!trendCategories.some((c) => c.id === categoryId)) {
            if (trendCategories[0]) {
                setCategoryId(trendCategories[0].id);
            }
        }
    }, [trendCategories, categoryId]);
    const [view, setView] = useState(() => loadPrefs().trendView);
    const now = nowDate();
    const expenses = state.expenses.filter((item) => item.categoryId === categoryId);
    const series = buildCashflow([], expenses, view, now);
    const total = series.expense.reduce((sum, value) => sum + value, 0);
    const active = state.categories.find((category) => category.id === categoryId);
    const pickView = (next) => {
        setView(next);
        savePrefs({ trendView: next });
    };
    const data = {
        labels: series.labels,
        datasets: [
            {
                label: active?.name ?? (isEn ? 'Expense' : 'Pengeluaran'),
                data: series.expense,
                borderColor: active?.color ?? EXPENSE_COLOR,
                backgroundColor: active?.color ?? EXPENSE_COLOR,
                tension: 0.3,
                pointRadius: 3,
                fill: false,
            },
        ],
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: { label: (ctx) => formatIDR(Number(ctx.parsed.y ?? 0)) },
            },
        },
        scales: {
            x: { ticks: { color: MUTED_COLOR, font: CHART_FONT } },
            y: {
                beginAtZero: true,
                ticks: {
                    color: MUTED_COLOR,
                    font: CHART_FONT,
                    callback: (value) => formatIDR(Number(value)),
                },
            },
        },
    };
    return (<section className="card">
      <header className="card-head">
        <h2>{isEn ? 'Trend by Category' : 'Tren per Kategori'}</h2>
        <div className="seg">
          {views.map((item) => (<button key={item.id} type="button" className={`seg-btn${view === item.id ? ' seg-active' : ''}`} onClick={() => pickView(item.id)}>
              {item.label}
            </button>))}
        </div>
      </header>

      <div className="filter-row">
        <CustomSelect className="input" aria-label={isEn ? 'Trend category' : 'Kategori tren'} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} title={isEn ? 'Select Trend Category' : 'Pilih Kategori Tren'}>
          {trendCategories.map((category) => (<option key={category.id} value={category.id}>
              {category.name}
            </option>))}
        </CustomSelect>
        <span className="muted small">
          {isEn ? `Visible total ${formatIDR(total)}` : `Total terlihat ${formatIDR(total)}`}
        </span>
      </div>

      {expenses.length === 0 ? (<p className="muted">{isEn ? 'No expenses in this category yet.' : 'Belum ada pengeluaran pada kategori ini.'}</p>) : (<div className="chart-box chart-box-bar">
          <Line data={data} options={options}/>
        </div>)}
    </section>);
}
