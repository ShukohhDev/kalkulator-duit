import type { AppState } from '../types'

const KIND_LABEL: Record<AppState['activity'][number]['kind'], string> = {
  pemasukan: 'Pemasukan',
  pengeluaran: 'Pengeluaran',
  login: 'Masuk',
  logout: 'Keluar',
}

function formatTime(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return '-'
  return new Date(ts).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ActivityPanel({ state }: { state: AppState }) {
  const items = state.activity
  return (
    <section className="card">
      <header className="card-head">
        <h2>Catatan Aktivitas</h2>
        <span className="muted small">{items.length} entri</span>
      </header>
      {items.length === 0 ? (
        <p className="empty">Belum ada aktivitas. Catatan pemasukan, pengeluaran, dan login muncul di sini.</p>
      ) : (
        <ul className="activity-list">
          {items.map((item) => (
            <li key={item.id} className="activity-item">
              <span className={`activity-kind activity-${item.kind}`}>{KIND_LABEL[item.kind]}</span>
              <span className="activity-text">{item.text}</span>
              <span className="activity-time muted small">{formatTime(item.ts)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
