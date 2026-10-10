import React, { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface CustomSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface CustomSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  title?: string
  placeholder?: string
  searchable?: boolean
}

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) {
    return node.map(extractText).join('')
  }
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children)
  }
  return String(node)
}

function extractOptions(children: React.ReactNode): CustomSelectOption[] {
  const options: CustomSelectOption[] = []

  const traverse = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return
      if (child.type === 'option') {
        const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>
        options.push({
          value: String(props.value ?? ''),
          label: extractText(props.children) || String(props.value ?? ''),
          disabled: Boolean(props.disabled),
        })
      } else if (child.type === React.Fragment) {
        traverse((child.props as { children?: React.ReactNode }).children)
      } else if (child.type === 'optgroup') {
        traverse((child.props as { children?: React.ReactNode }).children)
      }
    })
  }

  traverse(children)
  return options
}

export function CustomSelect({
  id,
  className = '',
  value,
  onChange,
  disabled = false,
  title,
  placeholder,
  searchable,
  children,
  'aria-label': ariaLabel,
  ...rest
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const nativeSelectRef = useRef<HTMLSelectElement>(null)

  const options = useMemo(() => extractOptions(children), [children])

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value))
  }, [options, value])

  const displayLabel = selectedOption ? selectedOption.label : (options[0]?.label || placeholder || '')

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [options, search])

  const showSearch = searchable !== undefined ? searchable : options.length > 5

  const handleSelect = (val: string) => {
    if (nativeSelectRef.current) {
      nativeSelectRef.current.value = val
      // Dispatch standard DOM change event
      const event = new Event('change', { bubbles: true })
      nativeSelectRef.current.dispatchEvent(event)
    }

    if (onChange) {
      const syntheticEvent = {
        target: {
          value: val,
          id: id || '',
          name: rest.name || '',
          type: 'select-one',
        },
        currentTarget: {
          value: val,
          id: id || '',
          name: rest.name || '',
          type: 'select-one',
        },
        persist: () => {},
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as React.ChangeEvent<HTMLSelectElement>
      onChange(syntheticEvent)
    }

    setIsOpen(false)
    setSearch('')
  }

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearch('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const modalTitle = title || ariaLabel || 'Pilihan'

  const modalContent = isOpen && typeof document !== 'undefined' ? (
    <div
      className="select-sheet-overlay"
      onClick={() => {
        setIsOpen(false)
        setSearch('')
      }}
    >
      <div
        className="select-sheet-container"
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="select-sheet-handle-bar" />

        <div className="select-sheet-head">
          <div className="select-sheet-title-group">
            <h3 className="select-sheet-title">{modalTitle}</h3>
            <p className="select-sheet-subtitle">Ketuk salah satu pilihan untuk menggunakannya</p>
          </div>
          <button
            type="button"
            className="select-sheet-close-btn"
            onClick={() => {
              setIsOpen(false)
              setSearch('')
            }}
            aria-label="Tutup jendela pilihan"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showSearch && (
          <div className="select-sheet-search-wrap">
            <svg className="select-sheet-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="input select-sheet-search-input"
              placeholder="Cari dalam pilihan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                type="button"
                className="select-sheet-search-clear"
                onClick={() => setSearch('')}
                aria-label="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div className="select-sheet-list">
          {filteredOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <button
                key={opt.value}
                type="button"
                className={`select-sheet-item ${isSelected ? 'select-sheet-item-active' : ''}`}
                onClick={() => handleSelect(opt.value)}
                disabled={opt.disabled}
              >
                <div className="select-sheet-item-content">
                  <span className="select-sheet-item-label">{opt.label}</span>
                </div>
                <div className={`select-sheet-radio ${isSelected ? 'select-sheet-radio-active' : ''}`}>
                  {isSelected && <span className="select-sheet-radio-check" />}
                </div>
              </button>
            )
          })}
          {filteredOptions.length === 0 && (
            <div className="select-sheet-empty">
              <span>Tidak ada pilihan yang cocok dengan "{search}"</span>
            </div>
          )}
        </div>

        <div className="select-sheet-foot">
          <button
            type="button"
            className="btn btn-outline select-sheet-cancel-btn"
            onClick={() => {
              setIsOpen(false)
              setSearch('')
            }}
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="custom-select-root">
      {/* Native select dipertahankan agar kompatibel dengan querySelector & event change */}
      <select
        ref={nativeSelectRef}
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        className="custom-select-native"
        tabIndex={-1}
        aria-hidden="true"
        {...rest}
      >
        {children}
      </select>

      {/* Trigger button kustom yang ramah sentuhan */}
      <button
        type="button"
        id={id ? `${id}-btn` : undefined}
        className={`input custom-select-trigger ${className}`}
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || title}
      >
        <span className="custom-select-display">{displayLabel}</span>
        <span className="custom-select-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {modalContent && createPortal(modalContent, document.body)}
    </div>
  )
}
