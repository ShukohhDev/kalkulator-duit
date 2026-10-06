// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../App'
import { formatIDR } from '../lib/money'
import { saveReceipt } from '../lib/receipts'

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
  Line: () => null,
}))

vi.mock('../lib/receipts', () => ({
  saveReceipt: vi.fn(async () => 'rcp-mock'),
  getReceipt: vi.fn(async () => null),
  deleteReceipt: vi.fn(async () => undefined),
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

const pickDay = (groupId: string, day: number) => {
  const button = container.querySelector(`#${groupId} [data-day="${day}"]`) as HTMLButtonElement | null
  if (!button) throw new Error(`tanggal ${day} di ${groupId} tidak ditemukan`)
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

const click = (selector: string) => {
  const element = container.querySelector(selector) as HTMLElement | null
  if (!element) throw new Error(`elemen ${selector} tidak ditemukan`)
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

const clickText = (selector: string, text: string) => {
  const element = [...container.querySelectorAll(selector)].find((item) => item.textContent?.includes(text))
  if (!element) throw new Error(`elemen ${selector} berisi "${text}" tidak ditemukan`)
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

  it('wizard onboarding memilih profil sebelum periode', () => {
    expect(container.textContent).toContain('Langkah 1')
    const cards = [...container.querySelectorAll('.wizard-card')]
    expect(cards).toHaveLength(2)

    const kos = cards.find((card) => card.textContent?.includes('Tinggal di Kos'))!
    act(() => {
      kos.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('.wizard-card')).toBeNull()

    click('.period-option')
    setValue('#allowance', '700000')
    const allowance = container.querySelector('#allowance')!.closest('section')!
    expect(allowance.textContent).toContain('Laundry')
  })

  it('memilih 1 minggu lalu menghitung alokasi profil tinggal di rumah', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    expect(container.textContent).toContain('Hasil alokasi')
    expect(container.textContent).toContain('210.000')
    expect(container.textContent).toContain('105.000')
    expect(container.textContent).toContain('49.000')
    expect(container.textContent).toContain('140.000')
    expect(container.textContent).toContain('Boleh belanja hari ini')
  })

  it('mengganti profil alokasi dari chip di pemilih periode', () => {
    click('.period-option')
    clickText('button', 'Periode: 1 Minggu')
    expect(container.querySelectorAll('.profile-chip')).toHaveLength(2)
    expect(container.querySelector('.profile-chip-on')?.textContent).toBe('Tinggal di Rumah')

    clickText('.profile-chip', 'Tinggal di Kos')
    expect(container.querySelector('.profile-chip-on')?.textContent).toBe('Tinggal di Kos')
    clickText('button', 'Batal')

    const options = [...container.querySelectorAll('#exp-cat option')].map((option) => option.textContent)
    expect(options.some((text) => text?.includes('Laundry'))).toBe(true)
    expect(options.some((text) => text?.includes('Sewa kos + listrik + keamanan'))).toBe(true)

    setValue('#allowance', '700000')
    expect(container.textContent).toContain('210.000')
    expect(container.textContent).toContain('168.000')
  })

  it('menambah tagihan dan utang lewat Kewajiban, lalu membayarnya tercatat sebagai pengeluaran', () => {
    click('.period-option')
    const soon = Math.min(28, new Date().getDate() + 1)

    setValue('#bill-name', 'Listrik')
    setValue('#bill-amount', '150000')
    pickDay('bill-due', soon)
    clickText('button', '+ Tambah tagihan')

    expect(container.textContent).toContain('tiap tgl')
    expect(container.querySelector('.insight-list')?.textContent).toContain('Listrik')
    expect(container.querySelector('.insight-list')?.textContent).toMatch(/jatuh tempo|H-\d/)

    clickText('.ob-row button', 'Bayar')
    expect(container.textContent).toContain('Lunas bulan ini')
    expect(container.textContent).toContain('Menampilkan 1 dari 1 catatan')

    setValue('#debt-name', 'Motor')
    setValue('#debt-total', '6000000')
    setValue('#debt-installment', '500000')
    pickDay('debt-due', 10)
    clickText('button', '+ Tambah utang')
    expect(container.textContent).toContain('Terbayar')
    expect(container.textContent).toContain('6.000.000')

    clickText('.ob-row button', 'Bayar angsuran')
    expect(container.textContent).toContain('500.000')
    expect(container.textContent).toContain('Menampilkan 2 dari 2 catatan')
  })

  it('menampilkan penanda kewajiban di kalender pengeluaran', () => {
    click('.period-option')
    setValue('#bill-name', 'Internet rumah')
    setValue('#bill-amount', '150000')
    pickDay('bill-due', 10)
    clickText('button', '+ Tambah tagihan')

    expect(container.querySelectorAll('.cal-dot-bill').length).toBeGreaterThan(0)
    expect(container.querySelector('.cal-legend')?.textContent).toContain('Tagihan')
    expect(container.querySelector('.cal-legend')?.textContent).toContain('Utang')

    const dayCell = [...container.querySelectorAll('.cal-cell')].find((cell) => cell.textContent?.includes('10'))
    expect(dayCell?.querySelector('.cal-dot-bill')).toBeTruthy()
    expect(dayCell?.getAttribute('title')).toContain('Internet rumah')

    act(() => {
      dayCell!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const detail = container.querySelector('.cal-detail')!
    expect(detail.textContent).toContain('Internet rumah')
    expect(detail.textContent).toContain('Tagihan')

    clickText('.cal-detail button', 'Tandai lunas')
    expect(container.querySelector('.cal-detail')?.textContent).toContain('lunas')
    expect(container.querySelector('.cal-dot-bill.cal-dot-paid')).toBeTruthy()
    expect(container.querySelector('.cal-cell .cal-dot-bill:not(.cal-dot-paid)')).toBeNull()
    expect(container.textContent).toContain('Lunas bulan ini')
  })

  it('mengelola dompet dan mengonversi total ke USD dengan kurs manual', () => {
    click('.period-option')

    expect(container.textContent).toContain('Dompet & E-wallet')
    setValue('#w-bal-wallet-rekening', '1570000')
    expect(container.querySelector('.wallet-total-value')?.textContent).toContain('1.570.000')

    clickText('.card-head .nav-chip', 'USD')
    expect(container.querySelector('#wallet-rate')).not.toBeNull()
    expect(container.querySelector('.wallet-total-value')?.textContent).toBe('$98')

    setValue('#wallet-rate', '15700')
    expect(container.querySelector('.wallet-total-value')?.textContent).toBe('$100')

    clickText('button', '+ Tambah dompet')
    expect(container.querySelectorAll('.ob-row')).toHaveLength(4)

    clickText('.ob-row .btn-danger', 'Hapus')
    expect(container.querySelectorAll('.ob-row')).toHaveLength(3)
  })

  it('melampirkan bukti pada pengeluaran lalu menampilkan tombol lihat bukti', async () => {
    click('.period-option')

    setValue('#exp-amount', '25000')
    const input = container.querySelector('#exp-receipt') as HTMLInputElement
    const file = new File(['bukti'], 'bukti.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {})
    expect(saveReceipt).toHaveBeenCalledWith(file)
    expect(container.textContent).toContain('Bukti terlampir')

    clickText('button', 'Catat pengeluaran')
    expect(container.textContent).toContain('Menampilkan 1 dari 1 catatan')
    expect([...container.querySelectorAll('.tx-actions button')].some((b) => b.textContent === 'Bukti')).toBe(true)
  })

  it('menampilkan tren per kategori dengan pesan kosong lalu grafik', () => {
    click('.period-option')
    expect(container.textContent).toContain('Tren per Kategori')
    expect(container.textContent).toContain('Belum ada pengeluaran pada kategori ini.')

    setValue('#exp-amount', '15000')
    clickText('button', 'Catat pengeluaran')
    expect(container.querySelector('.chart-box')).not.toBeNull()

    setSelect('[aria-label="Kategori tren"]', 'transport')
    expect(container.textContent).toContain('Belum ada pengeluaran pada kategori ini.')
  })

  it('membuka kalkulator lewat tombol melayang lalu menutup dengan Esc dan setelah Pakai angka', () => {
    click('.period-option')
    expect(container.querySelector('.calc-pop')).toBeNull()

    click('.fab:not(.fab-theme)')
    expect(container.querySelector('.calc-pop')).not.toBeNull()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(container.querySelector('.calc-pop')).toBeNull()

    click('.fab:not(.fab-theme)')
    const useNumber = [...container.querySelectorAll('.calc-pop button')].find((button) =>
      button.textContent?.includes('Pakai angka'),
    )
    expect(useNumber).toBeTruthy()
    act(() => {
      useNumber!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('.calc-pop')).toBeNull()
  })

  it('berganti tema lewat tombol melayang', () => {
    expect(document.documentElement.dataset.theme).toBe('light')
    click('.fab-theme')
    expect(document.documentElement.dataset.theme).toBe('dark')
    click('.fab-theme')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('menambah incaran wishlist dan menyetor dana kepadanya', () => {
    click('.period-option')
    clickText('button', 'Tambah incaran baru')

    const wishCard = [...container.querySelectorAll('section.card')].find((card) =>
      card.textContent?.includes('Wishlist / Incaran Beli'),
    )
    expect(wishCard).toBeTruthy()

    const [nameInput, priceInput, , depositInput] = [...wishCard!.querySelectorAll('input')] as HTMLInputElement[]
    expect(nameInput.value).toBe('Incaran 1')
    expect(wishCard!.textContent).toContain('(0%)')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    const type = (input: HTMLInputElement, value: string) => {
      act(() => {
        setter.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    type(nameInput as HTMLInputElement, 'HP baru')
    type(priceInput as HTMLInputElement, '500000')
    type(depositInput as HTMLInputElement, '50000')

    expect(wishCard!.textContent).toContain('500.000')
    const setor = [...wishCard!.querySelectorAll('button')].find((button) => button.textContent === 'Setor')
    expect(setor).toBeTruthy()
    act(() => {
      setor!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(wishCard!.textContent).toContain('(10%)')
    expect(wishCard!.textContent).toContain('setoran tercatat')
    expect(container.textContent).toContain('Setoran HP baru')
  })

  it('menampilkan baris aksi data dan toast saat dicadangkan', () => {
    expect(container.textContent).toContain('Data & Cadangan')
    expect(container.textContent).toContain('Cadangkan')
    expect(container.textContent).toContain('Pulihkan')
    expect(container.textContent).toContain('Excel')
    expect(container.querySelector('#nav-beranda section.card h2')?.textContent).toBe('Total Aset')
    expect(container.querySelector('#nav-data section.card h2')?.textContent).toBe('Data & Cadangan')

    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test') as unknown as typeof URL.createObjectURL
    globalThis.URL.revokeObjectURL = vi.fn()
    click('.period-option')
    clickText('button', 'Cadangkan')
    expect(container.querySelector('.toast')?.textContent).toContain('Cadangan tersimpan')
  })

  it('tombol catat cepat di topbar membuka form ringkas di Beranda', () => {
    click('.period-option')

    clickText('.topbar button', '+ Pengeluaran')
    expect(container.querySelector('#nav-beranda #qk-amount')).not.toBeNull()

    setValue('#qk-note', 'kopi susu')
    setValue('#qk-amount', '18000')
    const form = container.querySelector('#qk-amount')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(container.querySelector('.toast')?.textContent).toContain('Pengeluaran dicatat')
    expect(container.querySelector('#qk-amount') as HTMLInputElement).toBeTruthy()
    const expenseRow = [...container.querySelectorAll('#nav-catat .tx')].find((li) =>
      li.textContent?.includes('kopi susu'),
    )
    expect(expenseRow).toBeTruthy()
    expect(expenseRow!.textContent).toContain('18.000')

    clickText('.topbar button', '+ Pemasukan')
    expect(container.querySelector('#nav-beranda #qk-source')).not.toBeNull()
    setValue('#qk-amount', '50000')
    const incomeForm = container.querySelector('#qk-amount')!.closest('form') as HTMLFormElement
    act(() => {
      incomeForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(container.querySelector('.toast')?.textContent).toContain('Pemasukan dicatat')
    const incomeRow = [...container.querySelectorAll('#nav-catat .tx')].find((li) => li.querySelector('.tx-in'))!
    expect(incomeRow.textContent).toContain('Uang Lembaran')
    expect(incomeRow.textContent).toContain('50.000')

    clickText('.topbar button', '+ Pemasukan')
    expect(container.querySelector('#nav-beranda #qk-source')).toBeNull()
  })

  it('mengubah alokasi lewat tabel persen dengan redistribusi kategori opsional', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    clickText('button', 'Ubah alokasi')
    const table = container.querySelector('.alloc-table')
    expect(table).not.toBeNull()
    expect(table?.textContent).toContain('Tinggal di Rumah')

    setValue('[aria-label="Persen Makan & minum"]', '50')
    expect(container.querySelector('.alloc-check.text-danger')?.textContent).toBe('BELUM')

    setValue('[aria-label="Persen Transportasi/bensin"]', '0')
    expect(container.querySelector('.alloc-check-ok')?.textContent).toBe('OK')

    const simpan = [...container.querySelectorAll('.alloc-edit button')].find((b) =>
      b.textContent?.includes('Simpan alokasi'),
    ) as HTMLButtonElement
    expect(simpan.disabled).toBe(false)

    const langganan = container.querySelector('[aria-label="Opsional Langganan"]') as HTMLInputElement
    expect(langganan.checked).toBe(true)
    click('[aria-label="Opsional Langganan"]')
    expect(langganan.checked).toBe(false)
    expect((container.querySelector('[aria-label="Persen Makan & minum"]') as HTMLInputElement).value).toBe('51.5')
    expect(container.querySelector('.alloc-check-ok')?.textContent).toBe('OK')

    click('[aria-label="Opsional Langganan"]')
    expect(langganan.checked).toBe(true)
    expect(container.querySelector('.alloc-check-ok')?.textContent).toBe('OK')

    clickText('.alloc-edit button', 'Simpan alokasi')
    expect(container.querySelector('.alloc-table')).toBeNull()
    expect(container.querySelector('.alloc-cards')?.textContent).toContain('350.000')
    expect(container.querySelector('.alloc-cards')?.textContent).toContain('Langganan')
  })

  it('menambah kategori baru dan mengurangi alokasi jadi 0 di editor', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    clickText('button', 'Ubah alokasi')
    setValue('[aria-label="Nama kategori baru"]', 'Kopi')
    clickText('.alloc-add button', '+ Tambah kategori')
    expect(container.querySelector('[aria-label="Persen Kopi"]')).not.toBeNull()

    const simpan = [...container.querySelectorAll('.alloc-edit button')].find((b) =>
      b.textContent?.includes('Simpan alokasi'),
    ) as HTMLButtonElement
    expect(simpan.disabled).toBe(false)

    const kurangi = [...container.querySelectorAll('.alloc-edit button')].find((b) => b.textContent === 'Kurangi')!
    act(() => {
      kurangi.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.querySelector('.alloc-check.text-danger')?.textContent).toBe('BELUM')
    expect(simpan.disabled).toBe(true)

    setValue('[aria-label="Persen Makan & minum"]', '30')
    expect(container.querySelector('.alloc-check-ok')?.textContent).toBe('OK')
    clickText('.alloc-edit button', 'Simpan alokasi')

    expect(container.querySelector('.alloc-table')).toBeNull()
    expect(container.textContent).toContain('Kopi')
  })

  it('mencatat pengeluaran besar dan memicu insight', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    setValue('#exp-note', 'nasi goreng')
    setValue('#exp-amount', '360000')

    const form = container.querySelector('#exp-note')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(container.textContent).toContain('nasi goreng')
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
    setSelect('#inc-source', 'Transfer')
    setValue('#inc-amount', '50000')
    const form = container.querySelector('#inc-source')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    const incomeItem = [...container.querySelectorAll('.tx')].find((li) => li.querySelector('.tx-in'))!
    expect(incomeItem.textContent).toContain('Transfer')
    const editButton = [...incomeItem.querySelectorAll('button')].find((b) => b.textContent === 'Ubah')!
    act(() => {
      editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    setSelect('#inc-source', 'Uang Lembaran')
    setValue('#inc-amount', '75000')
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    const listText = container.querySelector('#inc-source')!.closest('section')!.querySelector('.tx-list')!.textContent
    expect(listText).toContain('Uang Lembaran')
    expect(listText).not.toContain('Transfer')
  })

  it('menghapus catatan lalu mengurungkannya lewat toast', () => {
    click('.period-option')
    setValue('#exp-note', 'nasi goreng')
    setValue('#exp-amount', '9000')
    const form = container.querySelector('#exp-amount')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(container.textContent).toContain('nasi goreng')

    const row = [...container.querySelectorAll('.tx')].find((li) => li.textContent?.includes('nasi goreng'))!
    const del = row.querySelector('.btn-danger') as HTMLButtonElement
    act(() => {
      del.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(container.textContent).not.toContain('nasi goreng')

    const toast = container.querySelector('.toast')!
    expect(toast.textContent).toContain('Catatan dihapus')
    clickText('.toast button', 'Urungkan')
    expect(container.textContent).toContain('nasi goreng')
    expect(container.querySelector('.toast')).toBeNull()
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
    expect([...categorySelect.options].map((option) => option.textContent)).toContain('Air Galón')
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
