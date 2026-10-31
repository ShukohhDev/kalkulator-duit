import { useI18n } from '../lib/i18n';
function formatTime(ts, lang) {
    if (!Number.isFinite(ts) || ts <= 0)
        return '-';
    return new Date(ts).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
export function ActivityPanel({ state }) {
    const { language } = useI18n();
    const items = state.activity;
    const getKindLabel = (kind) => {
        if (language === 'en') {
            switch (kind) {
                case 'pemasukan': return 'Income';
                case 'pengeluaran': return 'Expense';
                case 'login': return 'Sign In';
                case 'logout': return 'Sign Out';
            }
        }
        switch (kind) {
            case 'pemasukan': return 'Pemasukan';
            case 'pengeluaran': return 'Pengeluaran';
            case 'login': return 'Masuk';
            case 'logout': return 'Keluar';
        }
    };
    return (<section className="card">
      <header className="card-head">
        <h2>{language === 'en' ? 'Activity Log' : 'Catatan Aktivitas'}</h2>
        <span className="muted small">
          {items.length} {language === 'en' ? (items.length === 1 ? 'entry' : 'entries') : 'entri'}
        </span>
      </header>
      {items.length === 0 ? (<p className="empty">
          {language === 'en'
                ? 'No activity history yet. Income, expenses, and login activities will appear here.'
                : 'Belum ada riwayat aktivitas nih. Transaksi masuk, keluar, dan login kamu bakal nongol di sini.'}
        </p>) : (<ul className="activity-list">
          {items.map((item) => (<li key={item.id} className="activity-item">
              <span className={`activity-kind activity-${item.kind}`}>{getKindLabel(item.kind)}</span>
              <span className="activity-text">{item.text}</span>
              <span className="activity-time muted small">{formatTime(item.ts, language)}</span>
            </li>))}
        </ul>)}
    </section>);
}
