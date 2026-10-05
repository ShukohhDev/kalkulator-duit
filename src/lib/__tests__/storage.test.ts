import { describe, expect, it } from 'vitest'
import { sanitize } from '../storage'

const legacyCategories = [
  { id: 'makan', name: 'Makan & Minum', ratio: 0.5, builtin: true, color: '#e8590c' },
  { id: 'transport', name: 'Transport & Pulsa', ratio: 0.2, builtin: true, color: '#1971c2' },
  { id: 'nongkrong', name: 'Nongkrong / Ngopi', ratio: 0.1, builtin: true, color: '#9c36b5' },
  { id: 'tabungan', name: 'Ditabung / Investasi', ratio: 0.2, builtin: true, color: '#2f9e44' },
  { id: 'custom', name: 'Beli Buku', ratio: 0, builtin: false, color: '#5f3dc4' },
]

const legacy = {
  version: 1,
  mode: 'week',
  allowance: 700_000,
  categories: legacyCategories,
  expenses: [{ id: 'e1', date: '2026-10-01', categoryId: 'transport', note: 'bus', amount: 15_000 }],
}

describe('migrasi kategori lama ke 5 kategori', () => {
  it('memecah Transport & Pulsa 20% menjadi transport 15% + pulsa 5%', () => {
    const state = sanitize(legacy)
    const transport = state.categories.find((category) => category.id === 'transport')!
    const pulsa = state.categories.find((category) => category.id === 'pulsa')!

    expect(transport.ratio).toBeCloseTo(0.15, 9)
    expect(pulsa.ratio).toBeCloseTo(0.05, 9)
    expect(transport.name).toBe('Transport / Bensin')
    expect(pulsa.name).toBe('Pulsa & Kuota')

    const sum = state.categories.reduce((total, category) => total + category.ratio, 0)
    expect(sum).toBeCloseTo(1, 9)
  })

  it('rasio transport kustom dibagi 3:1 dan jumlah tetap 100%', () => {
    const custom = legacyCategories.map((category) =>
      category.id === 'transport'
        ? { ...category, ratio: 0.25 }
        : category.id === 'tabungan'
          ? { ...category, ratio: 0.15 }
          : category,
    )
    const state = sanitize({ ...legacy, categories: custom })
    const transport = state.categories.find((category) => category.id === 'transport')!
    const pulsa = state.categories.find((category) => category.id === 'pulsa')!

    expect(transport.ratio).toBeCloseTo(0.1875, 9)
    expect(pulsa.ratio).toBeCloseTo(0.0625, 9)
    const sum = state.categories.reduce((total, category) => total + category.ratio, 0)
    expect(sum).toBeCloseTo(1, 9)
  })

  it('kategori buatan pengguna dan catatan lama tidak tersentuh', () => {
    const state = sanitize(legacy)
    expect(state.categories.find((category) => category.id === 'custom')?.name).toBe('Beli Buku')
    expect(state.expenses).toHaveLength(1)
    expect(state.expenses[0].categoryId).toBe('transport')
  })

  it('data baru (sudah ada pulsa) tidak dimigrasi ulang dan idempoten', () => {
    const fresh = sanitize({ version: 1 })
    expect(fresh.categories).toHaveLength(8) // 6 alokasi + cicilan + tagihan (rasio 0)
    expect(fresh.categories.find((category) => category.id === 'pulsa')?.ratio).toBe(0.05)
    expect(fresh.categories.filter((category) => category.ratio === 0).map((category) => category.id)).toEqual([
      'cicilan',
      'tagihan',
    ])
    expect(sanitize(JSON.parse(JSON.stringify(fresh)))).toEqual(fresh)
  })
})

describe('wishlist', () => {
  it('data lama tanpa wishlist menjadi [] dan data wishlist tersanitasi', () => {
    const oldState = sanitize(legacy)
    expect(oldState.wishlist).toEqual([])

    const withWish = sanitize({
      ...legacy,
      wishlist: [{ id: 'w1', name: '  HP  ', price: '3000000', saved: -50 }],
      expenses: [
        { id: 'e1', date: '2026-10-01', categoryId: 'tabungan', note: 'setor', amount: 50_000, wishlistId: 'w1' },
        { id: 'e2', date: '2026-10-02', categoryId: 'makan', note: 'nasi', amount: 10_000 },
      ],
    })
    expect(withWish.wishlist).toEqual([{ id: 'w1', name: 'HP', price: 3_000_000, saved: 0 }])
    expect(withWish.expenses[0].wishlistId).toBe('w1')
    expect(withWish.expenses[1].wishlistId).toBeUndefined()
    expect(sanitize(JSON.parse(JSON.stringify(withWish)))).toEqual(withWish)
  })
})

describe('profil alokasi', () => {
  it('data lama tanpa profil menjadi tinggal-rumah dan nilai asing dinormalisasi', () => {
    expect(sanitize({ version: 1 }).profile).toBe('tinggal-rumah')
    expect(sanitize({ version: 1, profile: 'anak-kos' }).profile).toBe('tinggal-kos')
    expect(sanitize({ version: 1, profile: 'mahasiswa' }).profile).toBe('tinggal-rumah')
    expect(sanitize({ version: 1, profile: 'kos' }).profile).toBe('tinggal-rumah')
    expect(sanitize({ version: 1, profile: 'tinggal-kos' }).profile).toBe('tinggal-kos')
  })
})

describe('dompet', () => {
  it('data lama tanpa dompet mendapat dompet bawaan dan daftar tersanitasi', () => {
    const legacy = sanitize({ version: 1 })
    expect(legacy.wallets.map((wallet) => wallet.id)).toEqual(['wallet-rekening', 'wallet-ewallet', 'wallet-tunai'])

    const custom = sanitize({ version: 1, wallets: [{ id: 'w1', name: '  GoPay ', balance: '25000' }] })
    expect(custom.wallets).toEqual([{ id: 'w1', name: 'GoPay', balance: 25000 }])

    const empty = sanitize({ version: 1, wallets: [] })
    expect(empty.wallets).toEqual([])
  })
})

describe('bukti transaksi', () => {
  it('receiptId lolos sanitasi dan nilai kosong dibuang', () => {
    const state = sanitize({
      version: 1,
      expenses: [
        { id: 'e1', date: '2026-10-05', categoryId: 'makan', note: 'nasi', amount: 10_000, receiptId: 'rcp-1' },
        { id: 'e2', date: '2026-10-05', categoryId: 'makan', note: 'ayam', amount: 10_000, receiptId: '' },
      ],
    })
    expect(state.expenses[0].receiptId).toBe('rcp-1')
    expect(state.expenses[1].receiptId).toBeUndefined()
  })
})
