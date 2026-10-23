import type { ColorTheme, Theme } from '../types'

interface Props {
  colorTheme: ColorTheme
  themeMode: Theme
  onColorThemeChange: (colorTheme: ColorTheme) => void
  onThemeModeChange: (theme: Theme) => void
}

interface ColorThemeOption {
  id: ColorTheme
  name: string
  desc: string
  color: string
}

const COLOR_OPTIONS: ColorThemeOption[] = [
  {
    id: 'emerald',
    name: 'Emerald Fintech',
    desc: 'Nuansa hijau toska segar dan profesional.',
    color: '#0F766E',
  },
  {
    id: 'sage',
    name: 'Cozy Sage',
    desc: 'Nuansa hijau zaitun lembut dan tenang di mata.',
    color: '#15803D',
  },
  {
    id: 'nordic',
    name: 'Nordic Minimalist',
    desc: 'Nuansa monokrom bersih dengan aksen dingin.',
    color: '#0F172A',
  },
]

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export function ThemePickerCard({
  colorTheme,
  themeMode,
  onColorThemeChange,
  onThemeModeChange,
}: Props) {
  return (
    <section className="card theme-picker-card" aria-label="Pengaturan tema tampilan">
      <header className="card-head">
        <div>
          <h2>Tema dan Tampilan</h2>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Pilih kombinasi warna dan pencahayaan yang paling nyaman untuk Anda.
          </p>
        </div>
      </header>

      <div className="theme-picker-group">
        <label className="section-title">Pilihan Skema Warna</label>
        <div className="theme-grid">
          {COLOR_OPTIONS.map((opt) => {
            const isSelected = colorTheme === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                className={`theme-card-option${isSelected ? ' is-selected' : ''}`}
                onClick={() => onColorThemeChange(opt.id)}
                aria-pressed={isSelected}
              >
                <div className="theme-card-head">
                  <span
                    className="theme-swatch"
                    style={{ backgroundColor: opt.color }}
                    aria-hidden="true"
                  />
                  <strong className="theme-card-name">{opt.name}</strong>
                  {isSelected && <span className="theme-check">{CHECK_ICON}</span>}
                </div>
                <p className="theme-card-desc">{opt.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="theme-picker-group" style={{ marginTop: '20px' }}>
        <label className="section-title">Mode Pencahayaan</label>
        <div className="theme-mode-row">
          <button
            type="button"
            className={`btn btn-sm btn-ghost theme-mode-btn${themeMode === 'light' ? ' btn-active' : ''}`}
            onClick={() => onThemeModeChange('light')}
            aria-pressed={themeMode === 'light'}
          >
            Mode Terang
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-ghost theme-mode-btn${themeMode === 'dark' ? ' btn-active' : ''}`}
            onClick={() => onThemeModeChange('dark')}
            aria-pressed={themeMode === 'dark'}
          >
            Mode Gelap
          </button>
        </div>
      </div>
    </section>
  )
}
