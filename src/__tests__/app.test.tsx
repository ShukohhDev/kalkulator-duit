// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../App'

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

let container: HTMLDivElement
let root: Root

const setValue = (selector: string, value: string) => {
  const input = container.querySelector(selector) as HTMLInputElement | null
  if (!input) throw new Error(`elemen ${selector} tidak ditemukan`)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  act(() => {
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return input
}

const click = (selector: string) => {
  const element = container.querySelector(selector) as HTMLElement | null
  if (!element) throw new Error(`elemen ${selector} tidak ditemukan`)
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  window.localStorage.clear()
  window.confirm = () => true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<App />)
  })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('alur aplikasi', () => {
  it('membuka pilihan periode saat pertama kali', () => {
    expect(container.textContent).toContain('Kalkulator Uang Jajan')
    expect(container.textContent).toContain('1 Minggu')
    expect(container.textContent).toContain('1 Bulan')
  })

  it('memilih 1 minggu lalu menghitung alokasi 50/20/10/20', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    expect(container.textContent).toContain('Hasil alokasi')
    expect(container.textContent).toContain('350.000')
    expect(container.textContent).toContain('140.000')
    expect(container.textContent).toContain('70.000')
    expect(container.textContent).toContain('Boleh belanja hari ini')
  })

  it('mencatat pengeluaran dan membuka badge pertama', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    setValue('#exp-note', 'nasi goreng')
    setValue('#exp-amount', '15000')

    const form = container.querySelector('#exp-note')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(container.textContent).toContain('nasi goreng')
    expect(container.textContent).toContain('Langkah Pertama')
    expect(container.textContent).toContain('Saran Otomatis')
  })

  it('menghitung rekomendasi setoran target tabungan', () => {
    click('.period-option')
    const addButton = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tambah target baru'),
    )!
    act(() => {
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('Target Tabungan')
    setValue('.goal .input-money', '6000000')

    expect(container.textContent).toContain('Perhitungan untuk')
    expect(container.textContent).toContain('Rekomendasi setoran')
    expect(container.textContent).toContain('/ bulan')
  })
})
