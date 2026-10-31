import { challenge } from '../lib/challenge';
import { formatIDR } from '../lib/money';
import { useI18n } from '../lib/i18n';
export function ChallengeCard({ state, derived }) {
    const { language } = useI18n();
    const isEn = language === 'en';
    const result = challenge(state, derived);
    if (!result)
        return null;
    const deficit = result.left < 0;
    const circumference = 2 * Math.PI * 34;
    const progress = Math.min(1, result.spent / Math.max(1, result.target));
    const progressArc = progress * circumference;
    const statusColor = deficit ? 'var(--danger)' : result.finished ? 'var(--ok)' : 'var(--accent)';
    return (<section className="card challenge-card" aria-label={isEn ? 'Frugal Challenge' : 'Tantangan Hemat'}>
      <header className="card-head">
        <h2>{isEn ? 'Frugal Challenge' : 'Tantangan Hemat'}</h2>
        <span className="chip" style={{ background: 'var(--surface-3)', color: 'var(--text)', fontWeight: 600 }}>
          {result.points} {isEn ? 'pts' : 'poin'}
        </span>
      </header>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div role="progressbar" aria-valuenow={result.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={isEn ? 'Challenge spending progress' : 'Progres pengeluaran tantangan'} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-3)" strokeWidth="7"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke={statusColor} strokeWidth="7" strokeDasharray={`${progressArc} ${circumference}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <strong style={{ fontSize: '16px', fontWeight: 700, color: statusColor }}>
              {result.progressPct}%
            </strong>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '140px' }}>
          <p className="muted small" style={{ margin: '0 0 4px' }}>
            {isEn ? 'Target:' : 'Target:'} <strong style={{ color: 'var(--text)' }}>{formatIDR(result.target)}</strong>
            <span>{isEn ? ' (80% of allowance)' : ' (80% uang jajan)'}</span>
          </p>
          <p className="muted small" style={{ margin: '0 0 6px' }}>
            {isEn ? 'Spent:' : 'Terpakai:'} <strong style={{ color: statusColor }}>{formatIDR(result.spent)}</strong>
          </p>

          {deficit ? (<p className="challenge-status text-danger" style={{ margin: 0, fontSize: '13px' }}>
              {isEn
                ? `Over by ${formatIDR(-result.left)}. Challenge failed.`
                : `Kelebihan ${formatIDR(-result.left)}. Tantangan gagal.`}
            </p>) : result.finished ? (<p className="challenge-status text-ok" style={{ margin: 0, fontSize: '13px' }}>
              {isEn
                ? `Passed! ${formatIDR(result.left)} remaining unused.`
                : `Lolos! Sisa ${formatIDR(result.left)} tidak terpakai.`}
            </p>) : (<p className="challenge-status" style={{ margin: 0, fontSize: '13px' }}>
              {isEn
                ? `On track: ${formatIDR(result.left)} remaining.`
                : `Di jalur hemat: sisa ${formatIDR(result.left)}.`}
            </p>)}
        </div>
      </div>

      {result.streak > 0 && (<div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--ok-soft)',
                color: 'var(--ok)',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12.5px',
                fontWeight: 600,
            }}>
          {isEn
                ? `${result.streak} period winning streak!`
                : `Menang beruntun ${result.streak} periode!`}
        </div>)}
    </section>);
}
