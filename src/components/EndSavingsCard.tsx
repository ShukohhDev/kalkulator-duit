import type { AppState } from '../types'
import { formatIDR } from '../lib/money'

interface Props {
  state: AppState
}

export function EndSavingsCard({ state }: Props) {
  return (
    <section className="card aset-card" aria-label="Tabungan akhir periode">
      <header className="card-head">
        <h2>Tabungan Akhir Periode</h2>
      </header>
      <p className="aset-total">{formatIDR(state.endSavings)}</p>
      <p className="muted small">
        {state.endSavings > 0
          ? 'Sisa bersih uang jajan otomatis disapu ke sini saat periode berganti dan tersimpan di data dompet.'
          : 'Belum ada sisa. Sisa uang jajan tiap periode akan otomatis masuk ke sini dan tersimpan di data dompet.'}
      </p>
    </section>
  )
}
