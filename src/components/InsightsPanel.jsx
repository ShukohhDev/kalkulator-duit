import { useI18n } from '../lib/i18n';
import { ICON_CHECK, ICON_ALERT, ICON_INFO } from './icons';
const ICONS = {
    warn: ICON_ALERT,
    good: ICON_CHECK,
    info: ICON_INFO,
};
export function InsightsPanel({ insights }) {
    const { language } = useI18n();
    const isEn = language === 'en';
    if (insights.length === 0)
        return null;
    return (<section className="card">
      <header className="card-head">
        <h2>{isEn ? 'Automatic Suggestions' : 'Saran Otomatis'}</h2>
        <span className="muted small">{isEn ? 'calculated from your records' : 'dihitung dari catatanmu'}</span>
      </header>
      <ul className="insight-list">
        {insights.map((item) => (<li key={item.id} className={`insight insight-${item.tone}`}>
            <span className="insight-icon" aria-hidden="true">
              {ICONS[item.tone]}
            </span>
            <span>{item.text}</span>
          </li>))}
      </ul>
    </section>);
}
