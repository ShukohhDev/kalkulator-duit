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
    expect(transport.name).toBe('Transportasi/bensin')
    expect(pulsa.name).toBe('Pulsa/kuota')

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
    expect(fresh.categories).toHaveLength(9) // 7 alokasi + cicilan + tagihan (rasio 0)
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

describe('pemasukan tidak tetap', () => {
  it('data lama mendapat nilai default dan data baru tersanitasi', () => {
    const old = sanitize({ version: 1 })
    expect(old.incomeVar).toBe(false)
    expect(old.allowanceMax).toBe(0)
    expect(old.bonusSplit).toEqual({ savings: 50, buffer: 30, fun: 20 })

    const fresh = sanitize({
      version: 1,
      incomeVar: true,
      allowanceMax: '800000',
      bonusSplit: { savings: 60, buffer: 25, fun: 15 },
    })
    expect(fresh.incomeVar).toBe(true)
    expect(fresh.allowanceMax).toBe(800_000)
    expect(fresh.bonusSplit).toEqual({ savings: 60, buffer: 25, fun: 15 })

    const broken = sanitize({ version: 1, incomeVar: 'ya', allowanceMax: -10, bonusSplit: { savings: 999 } })
    expect(broken.incomeVar).toBe(false)
    expect(broken.allowanceMax).toBe(0)
    expect(broken.bonusSplit).toEqual({ savings: 100, buffer: 30, fun: 20 })
    expect(sanitize(JSON.parse(JSON.stringify(fresh)))).toEqual(fresh)
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

describe('sisa periode & jenis kategori', () => {
  it('jenis kategori lolos sanitasi, data rollover lama diakumulasi jadi pot', () => {
    const state = sanitize({
      version: 1,
      categories: [
        { id: 'nongkrong', name: 'Nongkrong', ratio: 0.15, builtin: true, color: '#9c36b5', kind: 'keinginan' },
        { id: 'custom', name: 'Kado', ratio: 0.05, builtin: false, color: '#5f3dc4', kind: 'aneh' },
      ],
      rollover: { makan: 60_000, custom: -5, hantu: 9_000, nongkrong: '12000' },
      pendingSavings: -400,
      periodKey: 'bulan',
    })

    expect(state.categories.find((category) => category.id === 'nongkrong')?.kind).toBe('keinginan')
    expect(state.categories.find((category) => category.id === 'custom')?.kind).toBeUndefined()
    // nilai valid (makan 60.000 + nongkrong 12.000 + hantu 9.000) masuk pot; negatif/non-angka dibuang
    expect(state.endSavings).toBe(81_000)
    expect(state.periodKey).toBe('')
  })

  it('endSavings eksplisit menang atas migrasi rollover lama', () => {
    const state = sanitize({
      version: 1,
      endSavings: 25_000,
      rollover: { makan: 1_000, 'dana-darurat': 50_000 },
      pendingSavings: 4_000,
      periodKey: '2026-10-05',
    })
    expect(state.endSavings).toBe(25_000)
    expect(state.periodKey).toBe('2026-10-05')
  })

  it('endSavings negatif dibuang', () => {
    expect(sanitize({ version: 1, endSavings: -50 }).endSavings).toBe(0)
    expect(sanitize({ version: 1 }).endSavings).toBe(0)
  })
})

describe('gaya hidup', () => {
  it('hanya id yang dikenal yang disimpan', () => {
    expect(sanitize({ version: 1 }).lifestyle).toBe('seimbang')
    expect(sanitize({ version: 1, lifestyle: 'hemat' }).lifestyle).toBe('hemat')
    expect(sanitize({ version: 1, lifestyle: 'santai' }).lifestyle).toBe('santai')
    expect(sanitize({ version: 1, lifestyle: 'hemat-gila' }).lifestyle).toBe('seimbang')
    expect(sanitize({ version: 1, lifestyle: 7 }).lifestyle).toBe('seimbang')
  })
})

describe('dana musiman & dana darurat', () => {
  it('list dana musiman dan saldo darurat dinormalisasi', () => {
    const state = sanitize({
      version: 1,
      seasonal: [
        { id: 's1', name: '  Lebaran  ', target: '500000', saved: -3, dueDate: '2027-03-01' },
        { name: '', dueDate: 'nanti', target: -10 },
      ],
    })

    expect(state.seasonal[0]).toEqual({
      id: 's1',
      name: 'Lebaran',
      target: 500_000,
      saved: 0,
      dueDate: '2027-03-01',
    })
    expect(state.seasonal[1].name).toBe('Dana musiman baru')
    expect(state.seasonal[1].dueDate).toBeUndefined()
    expect(state.seasonal[1].target).toBe(0)
    expect(sanitize({ version: 1 }).seasonal).toEqual([])
  })

  it('id setoran musiman divalidasi, saldo negatif dibuang', () => {
    const state = sanitize({
      version: 1,
      expenses: [
        { id: 'e1', date: '2026-10-06', categoryId: 'tabungan', note: 'Setoran', amount: 5_000, seasonalId: 7 },
        { id: 'e2', date: '2026-10-06', categoryId: 'tabungan', note: 'Setoran', amount: 5_000, seasonalId: 's1' },
      ],
    })
    expect(state.expenses[0].seasonalId).toBeUndefined()
    expect(state.expenses[1].seasonalId).toBe('s1')
  })
})

describe('daftar rencana belanja (shoppingList)', () => {
  it('membersihkan dan menormalisasi daftar belanja', () => {
    const state = sanitize({
      version: 1,
      shoppingList: [
        { id: 'item-1', name: '  Minyak Goreng 2L  ', estimatedPrice: 35000, checked: true, categoryId: 'makan' },
        { id: 'item-2', name: '', estimatedPrice: -5000, checked: false },
        { id: 'item-3', name: 'Buku', estimatedPrice: 15000, checked: 'yes' },
      ],
    })

    expect(state.shoppingList).toHaveLength(3)
    expect(state.shoppingList?.[0]).toEqual({
      id: 'item-1',
      name: 'Minyak Goreng 2L',
      estimatedPrice: 35000,
      checked: true,
      categoryId: 'makan',
    })
    expect(state.shoppingList?.[1].name).toBe('Barang belanjaan')
    expect(state.shoppingList?.[1].estimatedPrice).toBe(0)
    expect(state.shoppingList?.[1].checked).toBe(false)
    expect(state.shoppingList?.[2].checked).toBe(true)
  })

  it('mengembalikan array kosong jika shoppingList undefined atau non-array', () => {
    expect(sanitize({ version: 1 }).shoppingList).toEqual([])
    expect(sanitize({ version: 1, shoppingList: null }).shoppingList).toEqual([])
  })
})

