// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { renderAuthGate } from '../AuthGate.js';
import { getDeviceTheme, setDeviceTheme } from '../../lib/prefs.js';

describe('AuthGate component', () => {
  let container;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.dataset.theme = 'light';
    setDeviceTheme('light');
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('menampilkan tombol tema di sebelah kiri tombol ganti bahasa dan mengubah tema', () => {
    renderAuthGate(container, { onAuthed: () => {} });

    const topActions = container.querySelector('.auth-top-actions');
    expect(topActions).toBeTruthy();

    const themeBtn = topActions.querySelector('#btn-auth-theme');
    const langBtn = topActions.querySelector('.btn-lang-toggle');
    expect(themeBtn).toBeTruthy();
    expect(langBtn).toBeTruthy();

    // Pastikan tombol tema berada persis sebelum tombol bahasa (di sebelah kiri)
    expect(themeBtn.nextElementSibling).toBe(langBtn);

    // Default tema terang (light)
    expect(document.documentElement.dataset.theme).toBe('light');

    // Klik tombol tema -> beralih ke gelap (dark)
    themeBtn.click();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(getDeviceTheme()).toBe('dark');

    // Klik tombol tema lagi -> beralih kembali ke terang (light)
    const updatedThemeBtn = container.querySelector('#btn-auth-theme');
    updatedThemeBtn.click();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(getDeviceTheme()).toBe('light');
  });
});
