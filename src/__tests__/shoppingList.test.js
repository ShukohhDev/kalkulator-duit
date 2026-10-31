// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderShoppingListCard } from '../components/ShoppingListCard.js';
import { initialState } from '../lib/state.js';

let container;

const setValue = (selector, value) => {
  const input = container.querySelector(selector);
  if (!input) throw new Error(`elemen ${selector} tidak ditemukan`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return input;
};

const click = (selector) => {
  const element = container.querySelector(selector);
  if (!element) throw new Error(`elemen ${selector} tidak ditemukan`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

describe('ShoppingListCard component', () => {
  it('menampilkan form, daftar kosong, dan menambah barang baru', () => {
    let state = {
      ...initialState(),
      shoppingList: [],
    };
    const update = vi.fn((fn) => {
      state = fn(state);
    });
    const notify = vi.fn();

    renderShoppingListCard(container, { state, update, notify });

    // Periksa header & state kosong
    expect(container.textContent).toContain('Daftar Rencana Belanja');
    expect(container.textContent).toContain('Daftar belanja masih kosong');

    // Sebelum diisi, tombol disabled
    const addBtn = container.querySelector('#shopping-add-btn');
    expect(addBtn.disabled).toBe(true);

    // Isi nama barang
    setValue('#shopping-name-input', 'Beras Pandan Wangi');
    expect(addBtn.disabled).toBe(false);

    click('#shopping-add-btn');

    expect(update).toHaveBeenCalledTimes(1);
    expect(state.shoppingList).toHaveLength(1);
    expect(state.shoppingList?.[0].name).toBe('Beras Pandan Wangi');
    expect(state.shoppingList?.[0].checked).toBe(false);

    // Rerender dengan state baru
    renderShoppingListCard(container, { state, update, notify });
    expect(container.textContent).toContain('Beras Pandan Wangi');
    expect(container.textContent).toContain('1 belum dibeli');
  });

  it('menceklis barang, memfilter tab, dan mencatat ke pengeluaran dengan satu tombol', () => {
    let state = {
      ...initialState(),
      shoppingList: [
        { id: 'item-1', name: 'Telur Ayam 1kg', estimatedPrice: 30000, checked: false, categoryId: 'makan' },
        { id: 'item-2', name: 'Sabun Cuci', estimatedPrice: 15000, checked: false, categoryId: 'makan' },
      ],
      expenses: [],
    };

    const update = vi.fn((fn) => {
      state = fn(state);
    });
    const notify = vi.fn();

    renderShoppingListCard(container, { state, update, notify });

    // Ceklist item-1
    const checkbox1 = container.querySelector('input[type="checkbox"]');
    expect(checkbox1.checked).toBe(false);

    click('input[type="checkbox"]');
    expect(state.shoppingList?.[0].checked).toBe(true);

    // Rerender setelah ceklist
    renderShoppingListCard(container, { state, update, notify });
    expect(container.textContent).toContain('1 di keranjang');

    // Test tombol Catat ke Pengeluaran
    click('#shopping-checkout-button');

    // Verifikasi pengeluaran baru dibuat dan item yang diceklis terhapus dari daftar belanja
    expect(state.expenses).toHaveLength(1);
    expect(state.expenses[0].amount).toBe(30000);
    expect(state.expenses[0].note).toBe('Belanja: Telur Ayam 1kg');
    expect(state.expenses[0].categoryId).toBe('makan');

    // Sisa item di shoppingList adalah Sabun Cuci (yang belum diceklis)
    expect(state.shoppingList).toHaveLength(1);
    expect(state.shoppingList?.[0].name).toBe('Sabun Cuci');

    // Toast notifikasi muncul
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining('Berhasil mencatat belanjaan'),
      expect.any(Object),
    );
  });

  it('dapat menghapus item dari daftar belanja dan undo', () => {
    let state = {
      ...initialState(),
      shoppingList: [
        { id: 'item-1', name: 'Kopi Bubuk', estimatedPrice: 12000, checked: false, categoryId: 'makan' },
      ],
    };

    const update = vi.fn((fn) => {
      state = fn(state);
    });
    const notify = vi.fn();

    renderShoppingListCard(container, { state, update, notify });

    click('.shopping-delete-btn');

    expect(state.shoppingList).toHaveLength(0);
    expect(notify).toHaveBeenCalledWith('Barang "Kopi Bubuk" dihapus.', expect.objectContaining({ undo: expect.any(Function) }));
  });
});
