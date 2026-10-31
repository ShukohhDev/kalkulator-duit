import { getSupabaseClient } from './supabase';
import { sanitize } from './storage';
import { pushToPythonBackend, pullFromPythonBackend, isPythonServerOnline } from './pythonApi';
export async function pushStateToCloud(username, state) {
    const cleanName = username.trim();
    if (!cleanName) {
        return { success: false, error: 'Nama pengguna tidak valid' };
    }
    // 1. Coba simpan ke Backend Python (MySQL / SQLite) jika server aktif
    const pythonOnline = await isPythonServerOnline();
    let pythonResult = null;
    if (pythonOnline) {
        pythonResult = await pushToPythonBackend(cleanName, state);
    }
    // 2. Simpan juga ke Supabase jika terhubung (sebagai sinkronisasi cadangan)
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const nowIso = new Date().toISOString();
            const { error } = await supabase
                .from('user_data')
                .upsert({
                username: cleanName,
                data: state,
                updated_at: nowIso,
            }, { onConflict: 'username' });
            if (!error) {
                return { success: true, updatedAt: nowIso };
            }
        }
        catch {
            // Abaikan jika koneksi Supabase gagal
        }
    }
    if (pythonResult && pythonResult.success) {
        return pythonResult;
    }
    if (!supabase && !pythonOnline) {
        return { success: false, error: 'Layanan cloud tidak terhubung' };
    }
    return pythonResult || { success: false, error: 'Gagal sinkronisasi data' };
}
export async function pullStateFromCloud(username) {
    const cleanName = username.trim();
    if (!cleanName) {
        return { success: false, error: 'Nama pengguna tidak valid' };
    }
    // 1. Coba ambil dari Backend Python (MySQL / SQLite) jika server aktif
    if (await isPythonServerOnline()) {
        const pyRes = await pullFromPythonBackend(cleanName);
        if (pyRes.success && pyRes.state) {
            return {
                success: true,
                state: sanitize(pyRes.state),
                updatedAt: pyRes.updatedAt,
            };
        }
    }
    // 2. Ambil dari Supabase jika Python offline atau belum ada data
    const supabase = getSupabaseClient();
    if (!supabase) {
        return { success: false, error: 'Layanan cloud tidak terhubung' };
    }
    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('data, updated_at')
            .ilike('username', cleanName.replace(/([%_\\])/g, '\\$1'))
            .maybeSingle();
        if (error) {
            return { success: false, error: error.message };
        }
        if (!data || !data.data) {
            return { success: false, error: 'Belum ada data di cloud untuk akun ini' };
        }
        const sanitized = sanitize(data.data);
        return {
            success: true,
            state: sanitized,
            updatedAt: data.updated_at,
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Kesalahan jaringan';
        return { success: false, error: msg };
    }
}
