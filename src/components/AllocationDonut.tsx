import { useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import type { AppState } from '../types'
import type { Derived } from '../lib/derive'
import { CHART_FONT, MUTED_COLOR } from '../lib/chartSetup'
import { formatIDR } from '../lib/money'

interface Props {
  state: AppState
  derived: Derived
}

export function AllocationDonut({ state, derived }: Props) {
  const rows = useMemo(
    () =>
      state.categories
        .map((category) => ({
          category,
          allocated: state.allowance * category.ratio,
          spent: derived.spentByCategory[category.id] ?? 0,
        }))
        .filter((row) => row.spent > 0 || row.allocated > 0),
    [state.categories, state.allowance, derived.spentByCategory],
  )

  const spentRows = rows.filter((row) => row.spent > 0)
  const totalSpent = spentRows.reduce((sum, row) => sum + row.spent, 0)

  if (totalSpent <= 0) {
    return (
      <section className="card">
        <header className="card-head">
          <h2>Alokasi vs Realisasi</h2>
        </header>
        <p className="muted">Belum ada pengeluaran pada periode ini, jadi grafiknya masih kosong.</p>
      </section>
    )
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Alokasi vs Realisasi</h2>
        <span className="muted small">periode berjalan</span>
      </header>

      <div className="donut-wrap">
        <div className="chart-box chart-box-donut">
          <Doughnut
            data={{
              labels: spentRows.map((row) => row.category.name),
              datasets: [
                {
                  data: spentRows.map((row) => row.spent),
                  backgroundColor: spentRows.map((row) => row.category.color),
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '62%',
              plugins: {
                legend: { position: 'bottom', labels: { color: MUTED_COLOR, font: CHART_FONT, boxWidth: 12 } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatIDR(ctx.parsed)}` } },
              },
            }}
          />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Alokasi</th>
              <th>Realisasi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category.id}>
                <td>
                  <span className="alloc-dot" style={{ background: row.category.color }} />
                  {row.category.name}
                </td>
                <td>{row.allocated > 0 ? formatIDR(row.allocated) : '—'}</td>
                <td className={row.allocated > 0 && row.spent > row.allocated ? 'text-danger' : ''}>
                  {formatIDR(row.spent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted small">Total terpakai {formatIDR(totalSpent)} dari alokasi {formatIDR(derived.allocationInPeriod)}.</p>
    </section>
  )
}
