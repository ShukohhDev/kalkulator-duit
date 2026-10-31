/**
 * pythonApi.ts - Modul Klien untuk Komunikasi ke Backend Python & MySQL
 *
 * Modul ini menghubungkan antarmuka web (TypeScript/React) ke server Python (FastAPI).
 * Didesain sederhana agar mudah dibaca dan dipelajari oleh pemula.
 */
const PYTHON_API_KEY = 'kalkulator-duitmu:python_api_url';
const DEFAULT_API_URL = 'http://localhost:8000';
/**
 * Mendapatkan alamat URL server backend Python yang sedang aktif.
 */
export function getPythonApiUrl() {
    if (typeof window === 'undefined')
        return DEFAULT_API_URL;
    const stored = window.localStorage.getItem(PYTHON_API_KEY);
    if (stored && stored.trim())
        return stored.trim();
    return import.meta.env?.VITE_PYTHON_API_URL?.trim() || DEFAULT_API_URL;
}
/**
 * Menyimpan alamat URL server backend Python kustom.
 */
export function setPythonApiUrl(url) {
    if (typeof window === 'undefined')
        return;
    window.localStorage.setItem(PYTHON_API_KEY, url.trim());
}
/**
 * Memeriksa apakah server backend Python sedang aktif berjalan.
 */
export async function isPythonServerOnline() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${getPythonApiUrl()}/api/health`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return res.ok;
    }
    catch {
        return false;
    }
}
/**
 * Mengirim dan menyimpan data keuangan pengguna ke backend Python (MySQL / SQLite).
 */
export async function pushToPythonBackend(username, state) {
    try {
        const res = await fetch(`${getPythonApiUrl()}/api/sync/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username.trim(),
                data: state,
            }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            return { success: false, error: data.detail || data.error || 'Gagal menyimpan ke server Python' };
        }
        return { success: true, updatedAt: data.updated_at };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Koneksi ke server Python gagal';
        return { success: false, error: msg };
    }
}
/**
 * Mengambil data keuangan pengguna dari backend Python (MySQL / SQLite).
 */
export async function pullFromPythonBackend(username) {
    try {
        const cleanUser = encodeURIComponent(username.trim());
        const res = await fetch(`${getPythonApiUrl()}/api/sync/pull?username=${cleanUser}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
            return { success: false, error: data.detail || data.error || 'Data tidak ditemukan di server Python' };
        }
        return {
            success: true,
            state: data.state,
            updatedAt: data.updated_at,
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Koneksi ke server Python gagal';
        return { success: false, error: msg };
    }
}
