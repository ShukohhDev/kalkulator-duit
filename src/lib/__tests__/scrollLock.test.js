// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { lockBodyScroll } from '../scrollLock';
describe('lockBodyScroll helper', () => {
    beforeEach(() => {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    });
    it('mengunci overflow body menjadi hidden saat dipanggil', () => {
        const unlock = lockBodyScroll();
        expect(document.body.style.overflow).toBe('hidden');
        unlock();
        expect(document.body.style.overflow).toBe('');
    });
    it('menangani pemanggilan bertumpuk (ref-counting) dengan benar', () => {
        const unlock1 = lockBodyScroll();
        const unlock2 = lockBodyScroll();
        expect(document.body.style.overflow).toBe('hidden');
        unlock1();
        // Masih ada 1 lock aktif
        expect(document.body.style.overflow).toBe('hidden');
        unlock2();
        // Semua lock dilepas
        expect(document.body.style.overflow).toBe('');
    });
    it('idempoten ketika unlock dipanggil berulang kali', () => {
        const unlock = lockBodyScroll();
        expect(document.body.style.overflow).toBe('hidden');
        unlock();
        unlock();
        expect(document.body.style.overflow).toBe('');
    });
});
