import { useMemo, useState } from 'react'
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
  const [viewMode, setViewMode] = useState<'bar' | 'donut'>('bar')

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

  const spentRows = useMemo(() => rows.filter((row) => row.spent > 0), [rows])
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.spent - a.spent || b.allocated - a.allocated),
    [rows],
  )
  const totalSpent = spentRows.reduce((sum, row) => sum + row.spent, 0)

  if (totalSpent <= 0) {
    return (
      <section className="card" aria-label="Alokasi versus realisasi pengeluaran">
        <header className="card-head">
          <h2>Alokasi vs Realisasi</h2>
        </header>
        <p className="muted">Belum ada pengeluaran pada periode ini, jadi grafiknya masih kosong.</p>
      </section>
    )
  }

  return (
    <section className="card" aria-label="Alokasi versus realisasi pengeluaran">
      <header className="card-head">
        <div>
          <h2>Alokasi vs Realisasi</h2>
          <span className="muted small">periode berjalan</span>
        </div>
        <div className="btn-row" style={{ margin: 0 }}>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'bar' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setViewMode('bar')}
            aria-pressed={viewMode === 'bar'}
            title="Tampilan grafik batang horizontal yang diurutkan (mudah dibaca)"
          >
            📊 Batang Terurut
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'donut' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setViewMode('donut')}
            aria-pressed={viewMode === 'donut'}
            title="Tampilan grafik donut"
          >
            🍩 Donut
          </button>
        </div>
      </header>

      {viewMode === 'bar' ? (
        <div className="horizontal-bars-wrap" role="region" aria-label="Daftar pengeluaran per kategori terurut dari yang terbesar">
          {sortedRows.map((row) => {
            const pctSpent = row.allocated > 0 ? Math.min(100, Math.round((row.spent / row.allocated) * 100)) : 100
            const isOver = row.allocated > 0 && row.spent > row.allocated
            return (
              <div key={row.category.id} className="hbar-item">
                <div className="hbar-head">
                  <span className="hbar-label">
                    <span className="alloc-dot" style={{ background: row.category.color }} aria-hidden="true" />
                    <strong>{row.category.name}</strong>
                  </span>
                  <span className="hbar-amounts tabular-nums">
                    <strong>{formatIDR(row.spent)}</strong>
                    <span className="muted small"> / {row.allocated > 0 ? formatIDR(row.allocated) : '·'}</span>
                    {row.allocated > 0 && (
                      <span className={`chip chip-sm ${isOver ? 'chip-danger' : ''}`}>
                        {Math.round((row.spent / row.allocated) * 100)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="hbar-track" role="progressbar" aria-valuenow={row.spent} aria-valuemin={0} aria-valuemax={Math.max(row.allocated, row.spent)} aria-label={`${row.category.name}: ${formatIDR(row.spent)} dari ${formatIDR(row.allocated)}`}>
                  <div
                    className={`hbar-fill ${isOver ? 'hbar-over' : ''}`}
                    style={{
                      width: `${pctSpent}%`,
                      background: isOver ? 'var(--danger)' : row.category.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="donut-wrap">
          <div
            className="chart-box chart-box-donut"
            role="img"
            aria-label={`Grafik donat pengeluaran. Total terpakai ${formatIDR(totalSpent)} dari alokasi ${formatIDR(derived.allocationInPeriod)}`}
          >
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

          <div className="table-responsive">
            <table className="table" aria-label="Tabel perbandingan alokasi dan realisasi">
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
                      <span className="alloc-dot" style={{ background: row.category.color }} aria-hidden="true" />
                      {row.category.name}
                    </td>
                    <td className="tabular-nums">{row.allocated > 0 ? formatIDR(row.allocated) : '·'}</td>
                    <td className={`tabular-nums ${row.allocated > 0 && row.spent > row.allocated ? 'text-danger' : ''}`}>
                      {formatIDR(row.spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="muted small" style={{ marginTop: 12 }}>
        Total terpakai <strong className="tabular-nums">{formatIDR(totalSpent)}</strong> dari alokasi{' '}
        <strong className="tabular-nums">{formatIDR(derived.allocationInPeriod)}</strong>.
      </p>
    </section>
  )
}

