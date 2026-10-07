// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ShoppingListCard } from '../components/ShoppingListCard'
import { initialState } from '../lib/state'
import type { AppState } from '../types'

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
    input.dispatchEvent(new Event('change', { bubbles: true }))
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
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('ShoppingListCard component', () => {
  it('menampilkan form, daftar kosong, dan menambah barang baru', () => {
    let state: AppState = {
      ...initialState(),
      shoppingList: [],
    }
    const update = vi.fn((fn: (s: AppState) => AppState) => {
      state = fn(state)
    })
    const notify = vi.fn()

    act(() => {
      root.render(<ShoppingListCard state={state} update={update} notify={notify} />)
    })

    // Periksa header & state kosong
    expect(container.textContent).toContain('Daftar Rencana Belanja')
    expect(container.textContent).toContain('Daftar belanja masih kosong')

    // Sebelum diisi, tombol disabled
    const addBtn = container.querySelector('#shopping-add-btn') as HTMLButtonElement
    expect(addBtn.disabled).toBe(true)

    // Isi nama barang
    setValue('#shopping-name-input', 'Beras Pandan Wangi')
    expect(addBtn.disabled).toBe(false)

    click('#shopping-add-btn')

    expect(update).toHaveBeenCalledTimes(1)
    expect(state.shoppingList).toHaveLength(1)
    expect(state.shoppingList?.[0].name).toBe('Beras Pandan Wangi')
    expect(state.shoppingList?.[0].checked).toBe(false)

    // Rerender dengan state baru
    act(() => {
      root.render(<ShoppingListCard state={state} update={update} notify={notify} />)
    })
    expect(container.textContent).toContain('Beras Pandan Wangi')
    expect(container.textContent).toContain('1 belum dibeli')
  })

  it('menceklis barang, memfilter tab, dan mencatat ke pengeluaran dengan satu tombol', () => {
    let state: AppState = {
      ...initialState(),
      shoppingList: [
        { id: 'item-1', name: 'Telur Ayam 1kg', estimatedPrice: 30000, checked: false, categoryId: 'makan' },
        { id: 'item-2', name: 'Sabun Cuci', estimatedPrice: 15000, checked: false, categoryId: 'makan' },
      ],
      expenses: [],
    }

    const update = vi.fn((fn: (s: AppState) => AppState) => {
      state = fn(state)
    })
    const notify = vi.fn()

    act(() => {
      root.render(<ShoppingListCard state={state} update={update} notify={notify} />)
    })

    // Ceklist item-1
    const checkbox1 = container.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(checkbox1.checked).toBe(false)

    click('input[type="checkbox"]')
    expect(state.shoppingList?.[0].checked).toBe(true)

    // Rerender setelah ceklist
    act(() => {
      root.render(<ShoppingListCard state={state} update={update} notify={notify} />)
    })
    expect(container.textContent).toContain('1 di keranjang')

    // Test tombol Catat ke Pengeluaran
    click('#shopping-checkout-button')

    // Verifikasi pengeluaran baru dibuat dan item yang diceklis terhapus dari daftar belanja
    expect(state.expenses).toHaveLength(1)
    expect(state.expenses[0].amount).toBe(30000)
    expect(state.expenses[0].note).toBe('Belanja: Telur Ayam 1kg')
    expect(state.expenses[0].categoryId).toBe('makan')

    // Sisa item di shoppingList adalah Sabun Cuci (yang belum diceklis)
    expect(state.shoppingList).toHaveLength(1)
    expect(state.shoppingList?.[0].name).toBe('Sabun Cuci')

    // Toast notifikasi muncul
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining('Berhasil mencatat belanjaan'),
      expect.any(Object),
    )
  })

  it('dapat menghapus item dari daftar belanja dan undo', () => {
    let state: AppState = {
      ...initialState(),
      shoppingList: [
        { id: 'item-1', name: 'Kopi Bubuk', estimatedPrice: 12000, checked: false, categoryId: 'makan' },
      ],
    }

    const update = vi.fn((fn: (s: AppState) => AppState) => {
      state = fn(state)
    })
    const notify = vi.fn()

    act(() => {
      root.render(<ShoppingListCard state={state} update={update} notify={notify} />)
    })

    click('.shopping-delete-btn')

    expect(state.shoppingList).toHaveLength(0)
    expect(notify).toHaveBeenCalledWith('Barang "Kopi Bubuk" dihapus.', expect.objectContaining({ undo: expect.any(Function) }))
  })
})
