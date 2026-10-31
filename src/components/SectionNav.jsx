import { NAV_SVG_ICONS } from './icons';
import { useI18n } from '../lib/i18n';
export function SectionNav({ items, openId, onOpen, extraActions, isStickyDesktop, isSticky }) {
    const { language } = useI18n();
    const isEn = language === 'en';
    const isStickyActive = isSticky ?? isStickyDesktop;
    return (<nav className={`section-nav${isStickyActive ? ' section-nav-sticky' : ''}`} aria-label={isEn ? 'Panel navigation' : 'Navigasi panel'}>
      <div className="section-nav-items">
        {items.map((item) => {
            const isActive = openId === item.id;
            return (<button key={item.id} type="button" className={`nav-chip${isActive ? ' nav-chip-on' : ''}`} aria-expanded={isActive} onClick={() => onOpen(item.id)} title={item.label}>
              {NAV_SVG_ICONS[item.id] && (<span className="nav-chip-icon" aria-hidden="true">
                  {NAV_SVG_ICONS[item.id]}
                </span>)}
              <span>{item.label}</span>
            </button>);
        })}
      </div>
      {extraActions && <div className="section-nav-actions">{extraActions}</div>}
    </nav>);
}
