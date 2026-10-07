import { NAV_SVG_ICONS } from './icons'

export interface NavItem {
  id: string
  label: string
}

interface Props {
  items: NavItem[]
  openId: string | null
  onOpen: (id: string) => void
}

export function SectionNav({ items, openId, onOpen }: Props) {
  return (
    <nav className="section-nav" aria-label="Navigasi panel">
      {items.map((item) => {
        const isActive = openId === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`nav-chip${isActive ? ' nav-chip-on' : ''}`}
            aria-expanded={isActive}
            onClick={() => onOpen(item.id)}
            title={item.label}
          >
            {NAV_SVG_ICONS[item.id] && (
              <span className="nav-chip-icon" aria-hidden="true">
                {NAV_SVG_ICONS[item.id]}
              </span>
            )}
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
