// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPythonApiUrl, setPythonApiUrl, isPythonServerOnline, pushToPythonBackend, pullFromPythonBackend, } from '../pythonApi';
beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
});
describe('pythonApi', () => {
    it('mengembalikan URL default http://localhost:8000 jika belum diubah', () => {
        expect(getPythonApiUrl()).toBe('http://localhost:8000');
    });
    it('dapat mengatur dan membaca URL kustom', () => {
        setPythonApiUrl('http://127.0.0.1:8080');
        expect(getPythonApiUrl()).toBe('http://127.0.0.1:8080');
    });
    it('isPythonServerOnline mengembalikan false jika server tidak merespons', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Koneksi ditolak')));
        const status = await isPythonServerOnline();
        expect(status).toBe(false);
    });
    it('isPythonServerOnline mengembalikan true jika respons OK', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
        const status = await isPythonServerOnline();
        expect(status).toBe(true);
    });
    it('pushToPythonBackend mengembalikan success true saat server menerima data', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, updated_at: '2026-10-30T12:00:00Z' }),
        }));
        const res = await pushToPythonBackend('budi', { allowance: 500_000 });
        expect(res.success).toBe(true);
        expect(res.updatedAt).toBe('2026-10-30T12:00:00Z');
    });
    it('pullFromPythonBackend mengembalikan state saat data ditemukan', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                state: { allowance: 750_000 },
                updated_at: '2026-10-30T12:00:00Z',
            }),
        }));
        const res = await pullFromPythonBackend('budi');
        expect(res.success).toBe(true);
        expect(res.state?.allowance).toBe(750_000);
    });
});
