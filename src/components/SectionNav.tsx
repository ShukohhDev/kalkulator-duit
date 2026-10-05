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
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-chip${openId === item.id ? ' nav-chip-on' : ''}`}
          aria-expanded={openId === item.id}
          onClick={() => onOpen(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
