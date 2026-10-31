import { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { buildCashflow } from '../lib/derive';
import { CHART_FONT, EXPENSE_COLOR, INCOME_COLOR, MUTED_COLOR } from '../lib/chartSetup';
import { loadPrefs, savePrefs } from '../lib/prefs';
import { formatIDR } from '../lib/money';
import { useI18n } from '../lib/i18n';
const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: MUTED_COLOR, font: CHART_FONT } },
        tooltip: {
            callbacks: {
                label: (ctx) => `${ctx.label}: ${formatIDR(Number(ctx.parsed))}`,
            },
        },
    },
};
export function CashflowChart({ state, derived }) {
    const { language } = useI18n();
    const isEn = language === 'en';
    const views = useMemo(() => [
        { id: 'day', label: isEn ? 'Daily' : 'Harian' },
        { id: 'week', label: isEn ? 'Weekly' : 'Mingguan' },
        { id: 'month', label: isEn ? 'Monthly' : 'Bulanan' },
        { id: 'year', label: isEn ? 'Yearly' : 'Tahunan' },
    ], [isEn]);
    const charts = useMemo(() => [
        { id: 'bar', label: isEn ? 'Bar' : 'Batang' },
        { id: 'line', label: isEn ? 'Line' : 'Garis' },
        { id: 'donut', label: isEn ? 'Donut' : 'Donut' },
        { id: 'category', label: isEn ? 'Category' : 'Kategori' },
    ], [isEn]);
    const [view, setView] = useState(() => loadPrefs().view);
    const [chartType, setChartType] = useState(() => loadPrefs().chartType);
    useEffect(() => {
        savePrefs({ view, chartType });
    }, [view, chartType]);
    const series = useMemo(() => buildCashflow(derived.allIncomes, state.expenses, view), [derived.allIncomes, state.expenses, view]);
    const totalIn = series.income.reduce((sum, value) => sum + value, 0);
    const totalOut = series.expense.reduce((sum, value) => sum + value, 0);
    const empty = series.labels.length === 0;
    const categoryRows = state.categories
        .map((category) => ({ category, amount: series.categoryTotals[category.id] ?? 0 }))
        .filter((row) => row.amount > 0);
    const donutEmpty = chartType === 'donut' ? totalIn + totalOut === 0 : categoryRows.length === 0;
    const lineData = {
        labels: series.labels,
        datasets: [
            {
                label: isEn ? 'Income (+)' : 'Pemasukan (+)',
                data: series.income,
                borderColor: INCOME_COLOR,
                backgroundColor: INCOME_COLOR,
                tension: 0.25,
                pointRadius: 3,
            },
            {
                label: isEn ? 'Expenses (−)' : 'Pengeluaran (−)',
                data: series.expense,
                borderColor: EXPENSE_COLOR,
                backgroundColor: EXPENSE_COLOR,
                tension: 0.25,
                pointRadius: 3,
                borderDash: [5, 5],
            },
        ],
    };
    return (<section className="card" aria-label={isEn ? 'Cashflow chart for income and expenses' : 'Grafik arus kas pemasukan dan pengeluaran'}>
      <header className="card-head">
        <h2>{isEn ? 'Income vs Expenses' : 'Pemasukan vs Pengeluaran'}</h2>
        <div className="seg">
          {views.map((item) => (<button key={item.id} type="button" className={`seg-btn${view === item.id ? ' seg-active' : ''}`} onClick={() => setView(item.id)}>
              {item.label}
            </button>))}
        </div>
      </header>

      <div className="chart-type-row seg">
        {charts.map((item) => (<button key={item.id} type="button" className={`seg-btn${chartType === item.id ? ' seg-active' : ''}`} onClick={() => setChartType(item.id)}>
            {item.label}
          </button>))}
      </div>

      {empty || donutEmpty ? (<p className="muted">{isEn ? 'No data to display yet.' : 'Belum ada data untuk digambar.'}</p>) : (<>
          {chartType === 'bar' && (<div className="chart-box chart-box-bar" role="img" aria-label={isEn
                    ? 'Bar chart comparing income and expenses'
                    : 'Grafik batang perbandingan pemasukan dan pengeluaran'}>
              <Bar data={{
                    labels: series.labels,
                    datasets: [
                        {
                            label: isEn ? 'Income (+)' : 'Pemasukan (+)',
                            data: series.income,
                            backgroundColor: INCOME_COLOR,
                            borderRadius: 4,
                        },
                        {
                            label: isEn ? 'Expenses (−)' : 'Pengeluaran (−)',
                            data: series.expense,
                            backgroundColor: EXPENSE_COLOR,
                            borderRadius: 4,
                        },
                    ],
                }} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: MUTED_COLOR, font: CHART_FONT } },
                        tooltip: {
                            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatIDR(Number(ctx.parsed.y))}` },
                        },
                    },
                    scales: {
                        x: { ticks: { color: MUTED_COLOR, font: CHART_FONT }, grid: { display: false } },
                        y: {
                            ticks: {
                                color: MUTED_COLOR,
                                font: CHART_FONT,
                                callback: (value) => formatIDR(Number(value)),
                            },
                            grid: { color: 'rgba(134,142,150,0.15)' },
                        },
                    },
                }}/>
            </div>)}

          {chartType === 'line' && (<div className="chart-box chart-box-bar">
              <Line data={lineData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: MUTED_COLOR, font: CHART_FONT } },
                        tooltip: {
                            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatIDR(Number(ctx.parsed.y))}` },
                        },
                    },
                    scales: {
                        x: { ticks: { color: MUTED_COLOR, font: CHART_FONT }, grid: { display: false } },
                        y: {
                            ticks: {
                                color: MUTED_COLOR,
                                font: CHART_FONT,
                                callback: (value) => formatIDR(Number(value)),
                            },
                            grid: { color: 'rgba(134,142,150,0.15)' },
                        },
                    },
                }}/>
            </div>)}

          {chartType === 'donut' && (<div className="chart-box chart-box-donut">
              <Doughnut data={{
                    labels: isEn ? ['Income', 'Expenses'] : ['Pemasukan', 'Pengeluaran'],
                    datasets: [
                        {
                            data: [totalIn, totalOut],
                            backgroundColor: [INCOME_COLOR, EXPENSE_COLOR],
                            borderWidth: 0,
                        },
                    ],
                }} options={donutOptions}/>
            </div>)}

          {chartType === 'category' && (<div className="chart-box chart-box-donut">
              <Doughnut data={{
                    labels: categoryRows.map((row) => row.category.name),
                    datasets: [
                        {
                            data: categoryRows.map((row) => row.amount),
                            backgroundColor: categoryRows.map((row) => row.category.color),
                            borderWidth: 0,
                        },
                    ],
                }} options={donutOptions}/>
            </div>)}

          <div className="chart-summary">
            <span>
              <i className="dot" style={{ background: INCOME_COLOR }}/> {isEn ? 'Income' : 'Pemasukan'}{' '}
              {formatIDR(totalIn)}
            </span>
            <span>
              <i className="dot" style={{ background: EXPENSE_COLOR }}/> {isEn ? 'Expenses' : 'Pengeluaran'}{' '}
              {formatIDR(totalOut)}
            </span>
            <span className={totalIn - totalOut < 0 ? 'text-danger' : ''}>
              {isEn ? 'Net Difference' : 'Selisih'} {formatIDR(totalIn - totalOut)}
            </span>
          </div>
        </>)}
    </section>);
}
