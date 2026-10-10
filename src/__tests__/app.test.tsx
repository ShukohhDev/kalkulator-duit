// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../App'
import { register } from '../lib/auth'
import { formatIDR, daysBetween, toISO, addDays } from '../lib/money'
import { periodRange } from '../lib/allocation'
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

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.confirm = () => true
  // login wajib: buat akun test dulu supaya data ter-namespaces
  const failure = await register('tester', 'kata123')
  expect(failure).toBeNull()
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
    clickText('button', 'Konfirmasi Bayar')
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
    clickText('button', 'Konfirmasi Bayar')
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

  it('mengelola dompet dan mengonversi total ke USD dengan kurs otomatis', () => {
    click('.period-option')

    expect(container.textContent).toContain('Dompet & E-wallet')
    setValue('#w-bal-wallet-rekening', '1570000')
    expect(container.querySelector('.wallet-total-value')?.textContent).toContain('1.570.000')

    clickText('.card-head .nav-chip', 'USD')
    const note = container.querySelector('[data-testid="rate-note"]')!
    expect(note).toBeTruthy()
    expect(note.textContent).toMatch(/1 USD = Rp/)
    expect(container.querySelector('.wallet-total-value')?.textContent).toBe('$98')
    expect(container.querySelector('#wallet-rate')).toBeNull()

    clickText('.card-head .nav-chip', 'Rp')
    expect(container.querySelector('[data-testid="rate-note"]')).toBeNull()

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
    expect(container.querySelector('#nav-data section.card h2')?.textContent).toBe('Laporkan Masalah')
    expect(
      [...container.querySelectorAll('#nav-data section.card h2')].some((h) => h.textContent === 'Data & Cadangan'),
    ).toBe(true)

    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test') as unknown as typeof URL.createObjectURL
    globalThis.URL.revokeObjectURL = vi.fn()
    click('.period-option')
    clickText('button', 'Cadangkan')
    expect(container.querySelector('.toast')?.textContent).toContain('Cadangan tersimpan')
  })

  it('tombol catat cepat di topbar membuka popover form ringkas', () => {
    click('.period-option')

    clickText('.topbar button', '+ Pengeluaran')
    expect(container.querySelector('.quick-pop #qk-amount')).not.toBeNull()

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
    expect(container.querySelector('.quick-pop #qk-source')).not.toBeNull()
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
    expect(container.querySelector('.quick-pop #qk-source')).toBeNull()
  })

  it('shortcut E/P membuka popover dan diabaikan saat mengetik di input', () => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))
    })
    expect(container.querySelector('.quick-pop #qk-amount')).not.toBeNull()

    const amount = container.querySelector('#qk-amount') as HTMLInputElement
    act(() => {
      amount.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }))
    })
    expect(container.querySelector('.quick-pop #qk-amount')).not.toBeNull()
    expect(container.querySelector('.quick-pop #qk-source')).toBeNull()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))
    })
    expect(container.querySelector('.quick-pop')).toBeNull()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }))
    })
    expect(container.querySelector('.quick-pop #qk-source')).not.toBeNull()
  })

  it('klik di luar tombol catat cepat menutup popover', () => {
    clickText('.topbar button', '+ Pengeluaran')
    expect(container.querySelector('.quick-pop')).not.toBeNull()
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(container.querySelector('.quick-pop')).toBeNull()
  })

  it('kartu 7 hari menampilkan total dan menyalin ringkasan hari ini', async () => {
    expect(container.querySelector('.week-card .card-head h2')?.textContent).toBe('7 Hari Terakhir')
    expect(container.querySelector('.week-card .spark-wrap')).not.toBeNull()
    expect(container.querySelector('.week-card')?.textContent).toContain('0')

    const writeText = vi.fn(async (_text: string) => undefined)
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true })

    const copyButton = [...container.querySelectorAll('.week-card button')].find((button) =>
      button.textContent?.includes('Salin ringkasan hari ini'),
    )!
    await act(async () => {
      copyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(container.querySelector('.toast')?.textContent).toContain('Ringkasan hari ini disalin')
    expect(writeText.mock.calls[0][0]).toContain('Belum ada pengeluaran hari ini')

    clickText('.topbar button', '+ Pengeluaran')
    setValue('#qk-amount', '18000')
    const form = container.querySelector('#qk-amount')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(container.querySelector('.week-card')?.textContent).toContain('18.000')

    await act(async () => {
      copyButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    const copied = writeText.mock.calls[1][0]
    expect(copied).toContain('Pengeluaran hari ini: Rp')
    expect(copied).toContain('Makan & minum')
    expect(copied).toContain('18.000')
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
    expect((container.querySelector('#alloc-makan') as HTMLInputElement).value).toBe('350.000')
    expect(container.querySelector('.alloc-cards')?.textContent).toContain('Langganan')
  })

  it('mengedit nominal hasil alokasi mengubah persen lalu memperingatkan bila total tak 100%', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    setValue('#alloc-makan', '350000')
    expect(container.querySelector('.alloc-cards')?.textContent).toContain('50% dari uang jajan')
    expect(container.textContent).toContain('Total persen alokasi 120%')

    setValue('#alloc-makan', '210000')
    expect(container.querySelector('.alloc-cards')?.textContent).toContain('30% dari uang jajan')
    expect(container.textContent).not.toContain('Total persen alokasi')

    // nominal 0 ditunda sampai blur supaya kartu tidak hilang saat dikosongkan
    const input = setValue('#alloc-makan', '')
    expect(container.querySelector('.alloc-cards')?.textContent).toContain('Makan & minum')
    act(() => {
      // React memetakan onBlur ke focusout (delegated)
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(container.querySelector('.alloc-cards')?.textContent).not.toContain('Makan & minum')
    expect(container.textContent).toContain('Total persen alokasi 70%')
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

  it('kolom jenis kategori tersimpan dan mengatur perilaku rollover', () => {
    click('.period-option')
    setValue('#allowance', '700000')
    clickText('button', 'Ubah alokasi')

    expect((container.querySelector('[aria-label="Jenis Makan & minum"]') as HTMLSelectElement).value).toBe(
      'harian',
    )
    expect((container.querySelector('[aria-label="Jenis Nongkrong & ngopi"]') as HTMLSelectElement).value).toBe(
      'keinginan',
    )

    setSelect('[aria-label="Jenis Makan & minum"]', 'keinginan')
    clickText('.alloc-edit button', 'Simpan alokasi')
    expect(container.querySelector('.alloc-table')).toBeNull()

    clickText('button', 'Ubah alokasi')
    expect((container.querySelector('[aria-label="Jenis Makan & minum"]') as HTMLSelectElement).value).toBe(
      'keinginan',
    )
  })

  it('mencatat pengeluaran besar dan memicu insight', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    setValue('#exp-note', 'nasi goreng')
    setValue('#exp-amount', '750000')

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

  it('tujuan pemasukan mengalirkan dana (Saku Tabungan / e-wallet) lalu dibalik saat dihapus', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    // uang lebaran → Saku Tabungan
    setSelect('#inc-source', 'Uang Lembaran')
    setSelect('#inc-dest', 'pot')
    setValue('#inc-amount', '50000')
    const form = container.querySelector('#inc-source')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    const pot = container.querySelector('[aria-label="Tabungan akhir periode"]')!
    expect(pot.textContent).toContain(formatIDR(50_000))
    const incomeList = container.querySelector('#inc-source')!.closest('section')!.querySelector('.tx-list')!
    expect(incomeList.textContent).toContain('ke Saku Tabungan')

    // transfer → e-wallet: total aset naik
    const asetBefore = container.querySelector('.aset-total')!.textContent!
    setSelect('#inc-source', 'Transfer')
    setSelect('#inc-dest', 'wallet:wallet-ewallet')
    setValue('#inc-amount', '30000')
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    const asetAfter = container.querySelector('.aset-total')!.textContent!
    expect(asetAfter).not.toBe(asetBefore)

    // hapus pemasukan pertama (Saku Tabungan) → pot kembali 0, bisa diurungkan
    const potIncome = [...container.querySelectorAll('.tx')].find((li) =>
      li.textContent?.includes('ke Saku Tabungan'),
    )!
    act(() => {
      ;[...potIncome.querySelectorAll('button')].find((b) => b.textContent === 'Hapus')!.click()
    })
    expect(container.querySelector('[aria-label="Tabungan akhir periode"]')!.textContent).toContain(formatIDR(0))
    clickText('.toast button', 'Urungkan')
    expect(container.querySelector('[aria-label="Tabungan akhir periode"]')!.textContent).toContain(formatIDR(50_000))
  })

  it('mengedit nominal pemasukan membetulkan tujuan dengan delta', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    setSelect('#inc-dest', 'pot')
    setValue('#inc-amount', '40000')
    const form = container.querySelector('#inc-source')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(container.querySelector('[aria-label="Tabungan akhir periode"]')!.textContent).toContain(formatIDR(40_000))

    const item = [...container.querySelectorAll('.tx')].find((li) => li.querySelector('.tx-in'))!
    act(() => {
      ;[...item.querySelectorAll('button')].find((b) => b.textContent === 'Ubah')!.click()
    })
    setValue('#inc-amount', '25000')
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(container.querySelector('[aria-label="Tabungan akhir periode"]')!.textContent).toContain(formatIDR(25_000))
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
    // riwayat aktivitas sengaja mempertahankan catatan lama; yang dicek daftar pengeluaran
    const txList = container.querySelector('#exp-amount')!.closest('section')!.querySelector('.tx-list')!
    expect(txList.textContent).not.toContain('nasi goreng')

    const toast = container.querySelector('.toast')!
    expect(toast.textContent).toContain('Catatan dihapus')
    clickText('.toast button', 'Urungkan')
    expect(txList.textContent).toContain('nasi goreng')
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

describe('akun & catatan aktivitas', () => {
  it('keluar membuka layar masuk, masuk lagi kembali ke aplikasi', async () => {
    clickText('button', 'Keluar')
    expect(container.querySelector('.auth-gate')).not.toBeNull()
    expect(container.textContent).toContain('Akun di perangkat ini')
    expect(container.querySelector('.auth-names')?.textContent).toBe('tester')

    setValue('#auth-user', 'tester')
    setValue('#auth-pass', 'kata123')
    const card = container.querySelector('.auth-card') as HTMLFormElement
    await act(async () => {
      card.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      // hash password pakai WebCrypto: tunggu promise-nya selesai
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(container.querySelector('.auth-gate')).toBeNull()
    expect(container.querySelector('.chip-user')?.textContent).toBe('tester')
    expect(container.textContent).toContain('Keluar dari akun tester')
    expect(container.textContent).toContain('Masuk ke akun tester')
  })

  it('pengeluaran baru muncul di Catatan Aktivitas', () => {
    click('.period-option')
    setValue('#exp-note', 'bakso')
    setValue('#exp-amount', '12000')
    const form = container.querySelector('#exp-amount')!.closest('form') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    const newest = container.querySelector('.activity-item')!
    expect(newest.textContent).toContain('Pengeluaran')
    expect(newest.textContent).toContain('bakso')
  })
})

describe('pemasukan tidak tetap', () => {
  it('hitungan tetap pakai dasar, skenario bonus terpisah dan persennya bisa diubah', () => {
    click('.period-option')
    setValue('#allowance', '700000')
    clickText('button', 'Pemasukan tidak tetap')
    expect(container.querySelector('#allowance-max')).not.toBeNull()
    expect(container.querySelector('.bonus-card')).toBeNull()

    setValue('#allowance-max', '800000')
    let card = container.querySelector('.bonus-card')!
    expect(card.textContent).toContain(formatIDR(100_000))
    expect(card.textContent).toContain(formatIDR(50_000))
    expect(card.textContent).toContain(formatIDR(30_000))
    expect(card.textContent).toContain(formatIDR(20_000))
    // alokasi & turunannya tetap dari dasar
    expect(card.textContent).not.toContain('Total persen')

    setValue('#bonus-savings', '60')
    card = container.querySelector('.bonus-card')!
    expect(card.textContent).toContain('Total persen 110%')
    expect(card.textContent).toContain(formatIDR(60_000))
    expect(container.textContent).toContain(`Total alokasi = ${formatIDR(700_000)}`)
  })
})

describe('sisa periode & tanggal tua', () => {
  const seed = (extra: Record<string, unknown>) => {
    window.localStorage.setItem('kalkulator-duitmu:v1:tester', JSON.stringify({ version: 1, ...extra }))
    act(() => {
      root.unmount()
    })
    root = createRoot(container)
    act(() => {
      root.render(<App />)
    })
  }

  it('sisa uang jajan periode lalu disapu ke pot Tabungan akhir periode', () => {
    const prevWeek = periodRange('week', addDays(periodRange('week').start, -1))
    seed({
      mode: 'week',
      allowance: 700_000,
      periodKey: prevWeek.startISO,
      endSavings: 10_000,
      expenses: [
        { id: 'e1', date: prevWeek.startISO, categoryId: 'makan', note: '', amount: 150_000 },
      ],
    })

    // kartu alokasi kini tanpa sisa lalu, nominal = alokasi dasar
    const makanCard = [...container.querySelectorAll('.alloc-cards .wallet')].find((card) =>
      card.textContent?.includes('Makan'),
    )!
    expect((makanCard.querySelector('input') as HTMLInputElement).value).toBe('210.000')

    // sisa: 700.000 alokasi − 150.000 belanja + pot lama 10.000
    const pot = container.querySelector('[aria-label="Tabungan akhir periode"]')!
    expect(pot.textContent).toContain(formatIDR(560_000))
    expect(pot.textContent).toContain('otomatis disapu')
    // pot tidak ikut Total Aset
    const totalAset = container.querySelector('.aset-card')!.textContent!
    expect(totalAset).not.toContain(formatIDR(490_000))
  })

  it('pot tabungan tampil walau belum ada sisa', () => {
    seed({ mode: 'week', allowance: 700_000, periodKey: periodRange('week').startISO })
    const pot = container.querySelector('[aria-label="Tabungan akhir periode"]')!
    expect(pot.textContent).toContain(formatIDR(0))
    expect(pot.textContent).toContain('Belum ada sisa')
  })

  it('kartu uang tanggal tua menawarkan rencana alokasi dan hilang setelah diterapkan', () => {
    const period = periodRange('week')
    const elapsed = daysBetween(period.start, new Date()) + 1
    const spent = 100_000 * elapsed + 40_000 // laju harian > jajan harian, berlaku tiap hari
    seed({
      mode: 'week',
      allowance: 700_000,
      periodKey: period.startISO,
      expenses: [{ id: 'e-late', date: toISO(new Date()), categoryId: 'makan', note: 'boros', amount: spent }],
    })

    const card = container.querySelector('.late-card')!
    expect(card.textContent).toContain('Uang tanggal tua')
    expect(card.textContent).toContain('Terapkan rencana alokasi')

    click('.late-card .btn')
    expect(container.querySelector('.late-card')).toBeNull()
    expect(container.querySelector('.toast')?.textContent).toContain('Alokasi diperbarui')
    // keinginan dipotong: kartu Nongkrong hilang dari hasil alokasi
    const allocNames = [...container.querySelectorAll('.alloc-cards .wallet h3')].map((h) => h.textContent)
    expect(allocNames).toContain('Makan & minum')
    expect(allocNames).not.toContain('Nongkrong & ngopi')
  })
})

describe('peringatan, tips & gaya hidup', () => {
  const seed = (extra: Record<string, unknown>) => {
    window.localStorage.setItem('kalkulator-duitmu:v1:tester', JSON.stringify({ version: 1, ...extra }))
    act(() => {
      root.unmount()
    })
    root = createRoot(container)
    act(() => {
      root.render(<App />)
    })
  }

  it('kartu peringatan tampil saat kategori lewat alokasi dan bisa ditutup', () => {
    seed({
      mode: 'week',
      allowance: 700_000,
      periodKey: periodRange('week').startISO,
      expenses: [
        { id: 'e1', date: toISO(new Date()), categoryId: 'nongkrong', note: 'nongkrong', amount: 120_000 },
      ],
    })

    const card = container.querySelector('.alert-card')!
    expect(card.textContent).toContain('Peringatan')
    expect(card.textContent).toContain('Nongkrong')
    expect(card.textContent).toContain('kelebihan')

    click('.alert-dismiss')
    expect(container.querySelector('.alert-card')).toBeNull()
    expect(container.textContent).toContain('Hasil alokasi')
  })

  it('tanpa pelanggaran tidak ada kartu peringatan', () => {
    seed({
      mode: 'week',
      allowance: 700_000,
      periodKey: periodRange('week').startISO,
      expenses: [{ id: 'e1', date: toISO(new Date()), categoryId: 'makan', note: 'nasi', amount: 50_000 }],
    })
    expect(container.querySelector('.alert-card')).toBeNull()
  })

  it('tips hemat muncul dari pola belanja', () => {
    seed({
      mode: 'week',
      allowance: 700_000,
      periodKey: periodRange('week').startISO,
      expenses: [
        { id: 'e1', date: toISO(new Date()), categoryId: 'nongkrong', note: 'ngopi', amount: 150_000 },
      ],
    })
    const tips = container.querySelector('.tip-list')!
    expect(tips.textContent).toContain('Nongkrong & ngopi')
    expect(tips.textContent).toContain('pangkas 20%')
  })

  it('gaya hidup hemat diterapkan lalu ditumpuk saat ganti profil', () => {
    click('.period-option')
    setValue('#allowance', '700000')

    const before = formatIDR(Math.round(700_000 * 0.15))
    expect(container.textContent).toContain(before)

    setSelect('[aria-label="Gaya hidup"]', 'hemat')
    const apply = [...container.querySelectorAll('.front button')].find(
      (b) => b.textContent === 'Terapkan' && !(b as HTMLButtonElement).disabled,
    )!
    act(() => {
      apply.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('Gaya hidup aktif: Hemat')
    // nongkrong: .15 × .6 / 1.009 dari alokasi rumah
    const after = formatIDR(Math.round((700_000 * 0.15 * 0.6) / 1.009))
    expect(container.textContent).toContain(after)

    // ganti profil ke Kos → gaya hidup diterapkan ulang di atas dasar profil
    clickText('button', 'Periode: 1 Minggu')
    clickText('.profile-chip', 'Tinggal di Kos')
    clickText('button', 'Batal')

    expect(container.textContent).toContain('Gaya hidup aktif: Hemat')
    const stacked = formatIDR(Math.round((700_000 * 0.07 * 0.6) / 1.005))
    expect(container.textContent).toContain(stacked)
  })
})

describe('fase 5: dana darurat, dana musiman, terbalik, bagaimana kalau', () => {
  const seed = (extra: Record<string, unknown>) => {
    window.localStorage.setItem('kalkulator-duitmu:v1:tester', JSON.stringify({ version: 1, ...extra }))
    act(() => {
      root.unmount()
    })
    root = createRoot(container)
    act(() => {
      root.render(<App />)
    })
  }

  const card = (section: string, title: string) =>
    [...container.querySelectorAll(`${section} .card`)].find((item) => item.textContent?.includes(title))

  it('dana musiman: tambah, isi target & tanggal, setor dari e-wallet, lalu hapus', () => {
    seed({
      mode: 'week',
      allowance: 700_000,
      periodKey: periodRange('week').startISO,
      wallets: [
        { id: 'wallet-rekening', name: 'Rekening bank', balance: 100_000 },
        { id: 'wallet-ewallet', name: 'E-wallet', balance: 0 },
        { id: 'wallet-tunai', name: 'Tunai', balance: 0 },
      ],
    })

    clickText('#nav-tabungan button', '+ Tambah dana musiman')
    const name = container.querySelector('[aria-label="Nama dana musiman"]') as HTMLInputElement
    expect(name).toBeTruthy()
    const item = name.closest('article')!

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    const setNative = (input: HTMLInputElement, value: string) => {
      act(() => {
        setter.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }

    const targetLabel = [...item.querySelectorAll('label')].find((label) => label.textContent === 'Target (Rp)')!
    setNative(targetLabel.nextElementSibling as HTMLInputElement, '200000')

    const due = item.querySelector('input[type="date"]') as HTMLInputElement
    setNative(due, '2027-03-01')
    expect(due.value).toBe('2027-03-01')

    setNative(item.querySelector('[placeholder="Nominal setoran"]') as HTMLInputElement, '50000')
    clickText('#nav-tabungan button', 'Setor')

    const section = container.querySelector('[aria-label="Nama dana musiman"]')!.closest('section')!
    expect(section.textContent).toContain(`${formatIDR(50_000)} / ${formatIDR(200_000)}`)
    expect(section.textContent).toContain(`setoran tercatat ${formatIDR(50_000)}`)
    expect(section.textContent).toContain('hari lagi')

    const tx = [...container.querySelectorAll('#nav-catat .tx')].find((li) =>
      li.textContent?.includes('Setoran Dana 1'),
    )
    expect(tx).toBeTruthy()

    const hapus = [...container.querySelectorAll('[aria-label="Nama dana musiman"]')][0]
      .closest('article')!
      .querySelectorAll('button')
    const deleteButton = [...hapus].find((button) => button.textContent?.includes('Hapus'))!
    act(() => {
      deleteButton.click()
    })
    expect(container.querySelector('[aria-label="Nama dana musiman"]')).toBeNull()
  })

  it('kalkulator terbalik menghitung setoran dari target dan tenggat', () => {
    click('.period-option')
    click('.fab:not(.fab-theme)')
    clickText('.calc-pop button', 'Terbalik')

    setValue('#rev-target', '1200000')
    setValue('#rev-saved', '200000')
    setValue('#rev-months', '10')

    const pop = container.querySelector('.calc-pop')!
    expect(pop.textContent).toContain(formatIDR(1_000_000))
    expect(pop.textContent).toContain('Setoran per bulan')
    expect(pop.textContent).toContain(formatIDR(100_000))
    expect(pop.textContent).toContain('Setoran per hari')
    expect([...pop.querySelectorAll('button')].some((button) => button.textContent?.includes('Pakai angka'))).toBe(
      false,
    )

    clickText('.calc-pop button', 'Standar')
    expect(container.querySelector('.calc-keys')).not.toBeNull()
    expect(container.querySelector('.calc-display')).not.toBeNull()
  })

  it('kartu bagaimana kalau mensimulasikan skenario tanpa mengubah data', () => {
    seed({
      mode: 'week',
      allowance: 700_000,
      periodKey: periodRange('week').startISO,
      expenses: [{ id: 'e1', date: toISO(new Date()), categoryId: 'makan', note: '', amount: 140_000 }],
    })

    const scenario = card('#nav-analisis', 'Bagaimana Kalau')!
    expect(scenario.textContent).toContain(formatIDR(700_000))
    expect(scenario.textContent).toContain('simulasi saja')

    setSelect('#whatif-allowance', '30')
    expect(card('#nav-analisis', 'Bagaimana Kalau')!.textContent).toContain(formatIDR(910_000))

    // data asli tidak tersentuh
    expect((container.querySelector('#allowance') as HTMLInputElement).value).not.toBe('910.000')
  })
})

describe('fase 6: bukti catat cepat, skor kesehatan, tantangan, .ics, salin laporan', () => {
  const seed = (extra: Record<string, unknown>) => {
    window.localStorage.setItem('kalkulator-duitmu:v1:tester', JSON.stringify({ version: 1, ...extra }))
    act(() => {
      root.unmount()
    })
    root = createRoot(container)
    act(() => {
      root.render(<App />)
    })
  }

  it('form catat cepat punya pilihan bukti foto khusus mode pengeluaran', () => {
    clickText('.topbar button', '+ Pengeluaran')
    expect(container.querySelector('.quick-pop #qk-receipt')).not.toBeNull()

    clickText('.topbar button', '+ Pemasukan')
    expect(container.querySelector('.quick-pop #qk-receipt')).toBeNull()
    expect(container.querySelector('.quick-pop #qk-source')).not.toBeNull()
  })

  it('kartu skor kesehatan tampil di Analisis dengan 4 indikator', () => {
    seed({ mode: 'week', allowance: 700_000, periodKey: periodRange('week').startISO })
    const card = container.querySelector('#nav-analisis [aria-label="Skor kesehatan keuangan"]')!
    expect(card.textContent).toContain('Skor Kesehatan Keuangan')
    expect(card.textContent).toContain('/100')
    for (const label of ['Rasio tabungan', 'Cadangan tabungan', 'Beban kewajiban', 'Kepatuhan alokasi']) {
      expect(card.textContent).toContain(label)
    }
  })

  it('kartu tantangan hemat menampilkan target 80% uang jajan', () => {
    seed({
      mode: 'week',
      allowance: 700_000,
      periodKey: periodRange('week').startISO,
      expenses: [{ id: 'e1', date: toISO(new Date()), categoryId: 'makan', note: '', amount: 300_000 }],
    })
    const card = container.querySelector('#nav-beranda [aria-label="Tantangan Hemat"]')!
    expect(card.textContent).toContain('Tantangan Hemat')
    expect(card.textContent).toContain(formatIDR(700_000 * 0.8))
    expect(card.textContent).toContain('0 poin')
    expect(card.textContent).not.toContain('Kelebihan')
    expect(card.querySelector('[role="progressbar"]')).not.toBeNull()
  })

  it('tombol Ekspor .ics mengunduh kalender tagihan', () => {
    seed({
      mode: 'week',
      allowance: 700_000,
      periodKey: periodRange('week').startISO,
      bills: [{ id: 'b1', name: 'Listrik', amount: 100_000, dueDay: 20 }],
    })
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test') as unknown as typeof URL.createObjectURL
    globalThis.URL.revokeObjectURL = vi.fn()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    clickText('#nav-kewajiban button', 'Ekspor .ics')

    expect(container.querySelector('.toast')?.textContent).toContain('Kalender kewajiban diunduh')
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('laporan bulanan bisa disalin ke clipboard', async () => {
    seed({ mode: 'week', allowance: 700_000, periodKey: periodRange('week').startISO })
    const writeText = vi.fn(async (_text: string) => undefined)
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true })

    const button = [...container.querySelectorAll('#nav-laporan button')].find((item) =>
      item.textContent?.includes('Salin ringkasan'),
    )!
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(container.querySelector('.toast')?.textContent).toContain('Ringkasan laporan disalin')
    expect(writeText.mock.calls[0][0]).toContain('Laporan ')
    expect(writeText.mock.calls[0][0]).toContain('Uang jajan: ')
    expect(writeText.mock.calls[0][0]).toContain('Pengeluaran: ')
  })

  it('kartu Laporkan Masalah menyalin template laporan ke clipboard', async () => {
    const writeText = vi.fn(async (_text: string) => undefined)
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true })

    setSelect('#issue-type', 'Saran')
    const form = container.querySelector('[aria-label="Laporkan Masalah"]')!
    setValue('#issue-page', 'Dompet')
    const message = container.querySelector('#issue-message') as HTMLTextAreaElement
    const areaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!
    areaSetter.call(message, 'Tombol setor tidak muncul di HP.')
    act(() => {
      message.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const button = [...form.querySelectorAll('button')].find((item) => item.textContent === 'Salin laporan')!
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    const text = writeText.mock.calls[0][0]
    expect(text).toContain('[Saran] Kalkulator Uang Jajan')
    expect(text).toContain('Browser: ')
    expect(text).toContain('Halaman: Dompet')
    expect(text).toContain('Pesan: Tombol setor tidak muncul di HP.')
    expect(container.querySelector('.toast')?.textContent).toContain('Laporan disalin')
  })

  it('pengeluaran kategori tabungan dan dana darurat memotong saldo Tabungan akhir periode', () => {
    seed({
      endSavings: 500_000,
    })

    // Catat pengeluaran kategori dana darurat
    setValue('#exp-note', 'Beli obat darurat')
    setSelect('#exp-cat', 'dana-darurat')
    setValue('#exp-amount', '150000')
    const expForm = container.querySelector('#exp-note')!.closest('form') as HTMLFormElement
    act(() => {
      expForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    // Saldo pot berkurang: 500.000 - 150.000 = 350.000
    const pot = container.querySelector('[aria-label="Tabungan akhir periode"]')!
    expect(pot.textContent).toContain(formatIDR(350_000))

    // Hapus catatan pengeluaran, saldo pot kembali pulih
    clickText('.tx-actions button', 'Hapus')
    expect(pot.textContent).toContain(formatIDR(500_000))
  })

  it('pembayaran tagihan dan utang dapat memotong saldo dompet yang dipilih', () => {
    seed({
      wallets: [
        { id: 'w-test', name: 'GoPay', balance: 400_000 },
      ],
      bills: [
        { id: 'b-test', name: 'Paket Data', amount: 100_000, dueDay: 15 },
      ],
      debts: [
        { id: 'd-test', name: 'Kasbon', total: 200_000, paid: 0, installment: 50_000, dueDay: 20 },
      ],
    })

    // Bayar tagihan via GoPay
    clickText('.ob-row button', 'Bayar')
    setSelect('#pay-source-b-test', 'wallet:w-test')
    clickText('button', 'Konfirmasi Bayar')

    // Tagihan lunas dan toast via GoPay tampil
    expect(container.textContent).toContain('Lunas bulan ini')
    expect(container.querySelector('.toast')?.textContent).toContain('via GoPay')

    // Bayar angsuran utang via GoPay
    const debtRow = [...container.querySelectorAll('.ob-row')].find((row) => row.textContent?.includes('Kasbon'))!
    const debtPayBtn = [...debtRow.querySelectorAll('button')].find((btn) => btn.textContent === 'Bayar angsuran')!
    act(() => {
      debtPayBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    setSelect('#debt-source-d-test', 'wallet:w-test')
    clickText('button', 'Konfirmasi Bayar')

    // Sisa utang berkurang dan toast via GoPay tampil
    expect(container.textContent).toContain('150.000')
    expect(container.querySelector('.toast')?.textContent).toContain('via GoPay')
  })
})
