// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../App'
import { formatIDR } from '../lib/money'

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
  Line: () => null,
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

const setSelect = (selector: string, value: string) => {
  const select = container.querySelector(selector) as HTMLSelectElement | null
  if (!select) throw new Error(`elemen ${selector} tidak ditemukan`)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!
  setter.call(select, value)
  act(() => {
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
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

  it('memilih 1 minggu lalu menghitung alokasi 50/15/5/10/20', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    expect(container.textContent).toContain('Hasil alokasi')
    expect(container.textContent).toContain('350.000')
    expect(container.textContent).toContain('105.000')
    expect(container.textContent).toContain('35.000')
    expect(container.textContent).toContain('70.000')
    expect(container.textContent).toContain('Boleh belanja hari ini')

    expect(container.textContent).toContain('Alokasi per Hari')
    expect(container.textContent).toContain('50.000')
    expect(container.textContent).toContain('15.000')
    expect(container.textContent).toContain('/ hari')
  })

  it('membuka kalkulator lewat tombol melayang lalu menutup dengan Esc dan setelah Pakai angka', () => {
    click('.period-option')
    expect(container.querySelector('.calc-pop')).toBeNull()

    click('.fab')
    expect(container.querySelector('.calc-pop')).not.toBeNull()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(container.querySelector('.calc-pop')).toBeNull()

    click('.fab')
    const useNumber = [...container.querySelectorAll('.calc-pop button')].find((button) =>
      button.textContent?.includes('Pakai angka'),
    )
    expect(useNumber).toBeTruthy()
    act(() => {
      useNumber!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('.calc-pop')).toBeNull()
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

  it('menambah lalu mengedit pemasukan', () => {
    click('.period-option')
    setValue('#inc-source', 'pemasukan uji coba')
    setValue('#inc-amount', '50000')
    const form = container.querySelector('#inc-source')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    const incomeItem = [...container.querySelectorAll('.tx')].find((li) => li.querySelector('.tx-in'))!
    const editButton = [...incomeItem.querySelectorAll('button')].find((b) => b.textContent === 'Ubah')!
    act(() => {
      editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    setValue('#inc-source', 'thr')
    setValue('#inc-amount', '75000')
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(container.textContent).toContain('thr')
    expect(container.textContent).not.toContain('pemasukan uji coba')
  })

  it('pengeluaran kategori tabungan menambah saldo target yang dipilih', () => {
    click('.period-option')

    const addButton = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tambah target baru'),
    )!
    act(() => {
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    setValue('.goal .input-money', '100000')

    setSelect('#exp-cat', 'tabungan')
    expect(container.querySelector('#exp-goal')).not.toBeNull()

    setValue('#exp-amount', '30000')
    const form = container.querySelector('#exp-note')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(container.textContent).toContain(`${formatIDR(30_000)} / ${formatIDR(100_000)} (30%)`)
    expect(container.textContent).toContain('dari catatan kategori tabungan')
  })

  it('menerapkan preset kategori bawaan', () => {
    click('.period-option')
    setSelect('[aria-label="Preset kategori"]', 'preset-kos')
    const applyButton = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Terapkan')!
    act(() => {
      applyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const categorySelect = container.querySelector('#exp-cat') as HTMLSelectElement
    expect([...categorySelect.options].map((option) => option.textContent)).toContain('Laundry & Setrika')
  })

  it('laporan bulanan menampilkan ringkasan dan bisa dicetak', () => {
    click('.period-option')
    expect(container.textContent).toContain('Laporan Bulanan')

    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const printButton = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Cetak / Simpan PDF',
    )!
    act(() => {
      printButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(print).toHaveBeenCalledTimes(1)
    print.mockRestore()
  })
})
