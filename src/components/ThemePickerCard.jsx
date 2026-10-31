import { useI18n } from '../lib/i18n';
const COLOR_OPTIONS = [
    {
        id: 'emerald',
        name: 'Emerald Fintech',
        descId: 'Nuansa hijau toska segar dan profesional.',
        descEn: 'Fresh and professional emerald teal nuance.',
        color: '#0F766E',
    },
    {
        id: 'sage',
        name: 'Cozy Sage',
        descId: 'Nuansa hijau zaitun lembut dan tenang di mata.',
        descEn: 'Soft and calming olive sage green nuance.',
        color: '#15803D',
    },
    {
        id: 'nordic',
        name: 'Nordic Minimalist',
        descId: 'Nuansa monokrom bersih dengan aksen dingin.',
        descEn: 'Clean monochrome nuance with cool slate tones.',
        color: '#0F172A',
    },
];
const CHECK_ICON = (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>);
export function ThemePickerCard({ colorTheme, themeMode, onColorThemeChange, onThemeModeChange, }) {
    const { language } = useI18n();
    return (<section className="card theme-picker-card" aria-label={language === 'en' ? 'Theme and appearance settings' : 'Pengaturan tema tampilan'}>
      <header className="card-head">
        <div>
          <h2>{language === 'en' ? 'Theme & Appearance' : 'Tema dan Tampilan'}</h2>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            {language === 'en'
            ? 'Choose your favorite color palette and lighting mode.'
            : 'Pilih kombinasi warna dan pencahayaan yang paling nyaman untuk Anda.'}
          </p>
        </div>
      </header>

      <div className="theme-picker-group">
        <label className="section-title">{language === 'en' ? 'Color Palette' : 'Pilihan Skema Warna'}</label>
        <div className="theme-grid">
          {COLOR_OPTIONS.map((opt) => {
            const isSelected = colorTheme === opt.id;
            return (<button key={opt.id} type="button" className={`theme-card-option${isSelected ? ' is-selected' : ''}`} onClick={() => onColorThemeChange(opt.id)} aria-pressed={isSelected}>
                <div className="theme-card-head">
                  <span className="theme-swatch" style={{ backgroundColor: opt.color }} aria-hidden="true"/>
                  <strong className="theme-card-name">{opt.name}</strong>
                  {isSelected && <span className="theme-check">{CHECK_ICON}</span>}
                </div>
                <p className="theme-card-desc">{language === 'en' ? opt.descEn : opt.descId}</p>
              </button>);
        })}
        </div>
      </div>

      <div className="theme-picker-group" style={{ marginTop: '20px' }}>
        <label className="section-title">{language === 'en' ? 'Lighting Mode' : 'Mode Pencahayaan'}</label>
        <div className="theme-mode-row">
          <button type="button" className={`btn btn-sm btn-ghost theme-mode-btn${themeMode === 'light' ? ' btn-active' : ''}`} onClick={() => onThemeModeChange('light')} aria-pressed={themeMode === 'light'}>
            {language === 'en' ? 'Light Mode' : 'Mode Terang'}
          </button>
          <button type="button" className={`btn btn-sm btn-ghost theme-mode-btn${themeMode === 'dark' ? ' btn-active' : ''}`} onClick={() => onThemeModeChange('dark')} aria-pressed={themeMode === 'dark'}>
            {language === 'en' ? 'Dark Mode' : 'Mode Gelap'}
          </button>
        </div>
      </div>
    </section>);
}
