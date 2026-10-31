// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { translate, getDeviceLanguage, setDeviceLanguage, DEVICE_LANGUAGE_KEY, } from '../i18n';
import { loadPrefs, savePrefs } from '../prefs';
describe('modul i18n dwibahasa (id & en)', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });
    it('menerjemahkan teks navigasi dan antarmuka ke bahasa indonesia', () => {
        expect(translate('nav.beranda', 'id')).toBe('Beranda');
        expect(translate('topbar.expense', 'id')).toBe('+ Pengeluaran');
        expect(translate('topbar.income', 'id')).toBe('+ Pemasukan');
        expect(translate('week.meterTitle', 'id')).toBe('Jatah Jajan Hari Ini');
    });
    it('menerjemahkan teks navigasi dan antarmuka ke bahasa inggris', () => {
        expect(translate('nav.beranda', 'en')).toBe('Home');
        expect(translate('topbar.expense', 'en')).toBe('+ Expense');
        expect(translate('topbar.income', 'en')).toBe('+ Income');
        expect(translate('week.meterTitle', 'en')).toBe("Today's Daily Budget");
    });
    it('mendukung interpolasi parameter pada template teks', () => {
        const textId = translate('aset.walletsPrefix', 'id', { count: 3 });
        expect(textId).toContain('3 kantong');
        const textEn = translate('aset.walletsPrefix', 'en', { count: 5 });
        expect(textEn).toContain('5 wallets');
    });
    it('melakukan fallback ke bahasa default saat kunci tidak ada pada bahasa target', () => {
        // Kunci fiktif tidak ada di kamus en, harus fallback ke kunci itu sendiri jika kedua bahasa nihil
        expect(translate('kunci.acak.tidak.ada', 'en')).toBe('kunci.acak.tidak.ada');
    });
    it('menyimpan dan memuat bahasa perangkat melalui getDeviceLanguage dan setDeviceLanguage', () => {
        expect(getDeviceLanguage()).toBe('id');
        setDeviceLanguage('en');
        expect(getDeviceLanguage()).toBe('en');
        expect(window.localStorage.getItem(DEVICE_LANGUAGE_KEY)).toBe('en');
        setDeviceLanguage('id');
        expect(getDeviceLanguage()).toBe('id');
    });
    it('mengabaikan nilai storage yang tidak valid saat mengambil bahasa perangkat', () => {
        window.localStorage.setItem(DEVICE_LANGUAGE_KEY, 'invalid-lang');
        expect(getDeviceLanguage()).toBe('id');
    });
    it('mengintegrasikan preferensi bahasa dengan loadPrefs dan savePrefs', () => {
        expect(loadPrefs().language).toBeUndefined();
        savePrefs({ language: 'en' });
        expect(loadPrefs().language).toBe('en');
        savePrefs({ language: 'id' });
        expect(loadPrefs().language).toBe('id');
    });
});
