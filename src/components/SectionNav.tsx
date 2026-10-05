import { useEffect, useState } from 'react'

export interface NavItem {
  id: string
  label: string
}

interface Props {
  items: NavItem[]
}

export function SectionNav({ items }: Props) {
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    targets.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [items])

  const go = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }

  return (
    <nav className="section-nav" aria-label="Navigasi panel">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-chip${active === item.id ? ' nav-chip-on' : ''}`}
          aria-current={active === item.id ? 'true' : undefined}
          onClick={() => go(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
