import { billRemainingThisMonth, daysUntilDue, isBillFullyPaidThisMonth } from './obligations';
import { fetchUserReports } from './reports';
const READ_KEY_PREFIX = 'kalkulator-duitmu:read_notifs:';
export function getReadNotificationIds(username) {
    try {
        const raw = localStorage.getItem(`${READ_KEY_PREFIX}${username.toLowerCase()}`);
        if (!raw)
            return new Set();
        const arr = JSON.parse(raw);
        return new Set(Array.isArray(arr) ? arr : []);
    }
    catch {
        return new Set();
    }
}
export function markNotificationAsRead(username, notifId) {
    try {
        const set = getReadNotificationIds(username);
        set.add(notifId);
        localStorage.setItem(`${READ_KEY_PREFIX}${username.toLowerCase()}`, JSON.stringify(Array.from(set)));
    }
    catch {
        // ignore
    }
}
export function markAllNotificationsAsRead(username, notifIds) {
    try {
        const set = getReadNotificationIds(username);
        for (const id of notifIds) {
            set.add(id);
        }
        localStorage.setItem(`${READ_KEY_PREFIX}${username.toLowerCase()}`, JSON.stringify(Array.from(set)));
    }
    catch {
        // ignore
    }
}
export async function buildUserNotifications(username, state, derived, lang = 'id') {
    const items = [];
    const readIds = getReadNotificationIds(username);
    const now = new Date();
    const isEn = lang === 'en';
    // 1. Notifikasi Finansial: Peringatan Pengeluaran & Anggaran Kategori
    for (const cat of state.categories) {
        if (cat.off)
            continue;
        const spent = derived.spentByCategory[cat.id] ?? 0;
        const alloc = derived.allocationByCategory[cat.id] ?? 0;
        if (alloc > 0 && spent >= alloc) {
            const over = spent - alloc;
            items.push({
                id: `fin-cat-over-${cat.id}`,
                kind: 'finance',
                title: isEn
                    ? `Category ${cat.name} Exceeded Budget`
                    : `Kategori ${cat.name} Melebihi Batas`,
                message: isEn
                    ? `Spending has exceeded the allocation limit by Rp ${over.toLocaleString('id-ID')}. Consider economizing in this category.`
                    : `Pengeluaran sudah melampaui batas alokasi sebesar Rp ${over.toLocaleString('id-ID')}. Pertimbangkan berhemat untuk pos ini.`,
                timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
                read: readIds.has(`fin-cat-over-${cat.id}`),
                tag: isEn ? 'Budget Alert' : 'Peringatan Anggaran',
            });
        }
        else if (alloc > 0 && spent >= alloc * 0.85) {
            items.push({
                id: `fin-cat-warn-${cat.id}`,
                kind: 'finance',
                title: isEn
                    ? `Category ${cat.name} Almost at Budget Limit`
                    : `Kategori ${cat.name} Hampir Mencapai Batas`,
                message: isEn
                    ? `Spending has reached ${Math.round((spent / alloc) * 100)}% of the planned limit.`
                    : `Pengeluaran sudah mencapai ${Math.round((spent / alloc) * 100)}% dari batas yang direncanakan.`,
                timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
                read: readIds.has(`fin-cat-warn-${cat.id}`),
                tag: isEn ? 'Budget Alert' : 'Peringatan Anggaran',
            });
        }
    }
    // 2. Notifikasi Finansial: Tagihan & Cicilan Utang
    for (const bill of state.bills) {
        const isPaid = isBillFullyPaidThisMonth(bill, now);
        if (isPaid)
            continue;
        const days = daysUntilDue(bill.dueDay, now);
        const remaining = billRemainingThisMonth(bill, now);
        if (days === 0) {
            items.push({
                id: `fin-bill-today-${bill.id}`,
                kind: 'finance',
                title: isEn
                    ? `Bill Due Today: ${bill.name}`
                    : `Tagihan Jatuh Tempo Hari Ini: ${bill.name}`,
                message: isEn
                    ? `Bill of Rp ${remaining.toLocaleString('id-ID')} is due today.`
                    : `Tagihan sebesar Rp ${remaining.toLocaleString('id-ID')} jatuh tempo hari ini.`,
                timestamp: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
                read: readIds.has(`fin-bill-today-${bill.id}`),
                tag: isEn ? 'Due Date' : 'Jatuh Tempo',
            });
        }
        else if (days <= 3) {
            items.push({
                id: `fin-bill-soon-${bill.id}`,
                kind: 'finance',
                title: isEn
                    ? `Bill Due Soon: ${bill.name}`
                    : `Tagihan Mendekati Tenggat: ${bill.name}`,
                message: isEn
                    ? `Bill of Rp ${remaining.toLocaleString('id-ID')} is due in ${days} day${days > 1 ? 's' : ''}.`
                    : `Tagihan sebesar Rp ${remaining.toLocaleString('id-ID')} jatuh tempo dalam ${days} hari lagi.`,
                timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
                read: readIds.has(`fin-bill-soon-${bill.id}`),
                tag: isEn ? 'Due Date' : 'Jatuh Tempo',
            });
        }
    }
    for (const debt of state.debts) {
        const remaining = Math.max(0, debt.total - debt.paid);
        if (remaining <= 0)
            continue;
        const days = daysUntilDue(debt.dueDay, now);
        if (days === 0) {
            items.push({
                id: `fin-debt-today-${debt.id}`,
                kind: 'finance',
                title: isEn
                    ? `Debt Installment Due Today: ${debt.name}`
                    : `Cicilan Utang Jatuh Tempo Hari Ini: ${debt.name}`,
                message: isEn
                    ? `Installment of Rp ${debt.installment.toLocaleString('id-ID')} is due today. Remaining debt: Rp ${remaining.toLocaleString('id-ID')}.`
                    : `Cicilan sebesar Rp ${debt.installment.toLocaleString('id-ID')} jatuh tempo hari ini. Sisa utang: Rp ${remaining.toLocaleString('id-ID')}.`,
                timestamp: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
                read: readIds.has(`fin-debt-today-${debt.id}`),
                tag: isEn ? 'Due Date' : 'Jatuh Tempo',
            });
        }
        else if (days <= 3) {
            items.push({
                id: `fin-debt-soon-${debt.id}`,
                kind: 'finance',
                title: isEn
                    ? `Debt Installment Due Soon: ${debt.name}`
                    : `Cicilan Utang Segera Jatuh Tempo: ${debt.name}`,
                message: isEn
                    ? `Installment of Rp ${debt.installment.toLocaleString('id-ID')} is due in ${days} day${days > 1 ? 's' : ''}.`
                    : `Cicilan sebesar Rp ${debt.installment.toLocaleString('id-ID')} jatuh tempo dalam ${days} hari lagi.`,
                timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
                read: readIds.has(`fin-debt-soon-${debt.id}`),
                tag: isEn ? 'Due Date' : 'Jatuh Tempo',
            });
        }
    }
    // 3. Notifikasi Laporan Pengguna & Balasan Admin
    try {
        const allReports = await fetchUserReports();
        // Pengguna melihat laporannya sendiri; Admin dapat melihat semua laporan
        const userReports = allReports.filter((r) => r.username.toLowerCase() === username.toLowerCase());
        for (const rep of userReports) {
            // A. Jika ada balasan dari Admin:
            if (rep.admin_reply) {
                const replyNotifId = `rep-reply-${rep.id}-${rep.replied_at || 'v1'}`;
                items.push({
                    id: replyNotifId,
                    kind: 'admin_reply',
                    title: isEn
                        ? `Admin reply on ${rep.type}: "${rep.message.slice(0, 30)}${rep.message.length > 30 ? '...' : ''}"`
                        : `Balasan Admin atas ${rep.type}: "${rep.message.slice(0, 30)}${rep.message.length > 30 ? '...' : ''}"`,
                    message: rep.admin_reply,
                    timestamp: rep.replied_at || rep.created_at,
                    read: readIds.has(replyNotifId),
                    tag: isEn ? 'Admin Reply' : 'Balasan Admin',
                    metadata: {
                        reportId: rep.id,
                        status: rep.status,
                        type: rep.type,
                    },
                });
            }
            // B. Notifikasi Pembaruan Status Laporan (Diproses / Selesai)
            if (rep.status !== 'baru') {
                const statusNotifId = `rep-status-${rep.id}-${rep.status}`;
                const statusLabel = isEn
                    ? (rep.status === 'selesai' ? 'Resolved' : 'In Progress')
                    : (rep.status === 'selesai' ? 'Sudah Selesai Diproses' : 'Sedang Diproses');
                items.push({
                    id: statusNotifId,
                    kind: 'report_status',
                    title: isEn
                        ? `${rep.type} Status Updated: ${statusLabel}`
                        : `Status ${rep.type} Diperbarui: ${statusLabel}`,
                    message: isEn
                        ? `Your report: "${rep.message.slice(0, 40)}${rep.message.length > 40 ? '...' : ''}" is currently ${statusLabel.toLowerCase()} by the site admin.`
                        : `Laporan Anda: "${rep.message.slice(0, 40)}${rep.message.length > 40 ? '...' : ''}" saat ini ${statusLabel.toLowerCase()} oleh pemilik website.`,
                    timestamp: rep.created_at,
                    read: readIds.has(statusNotifId),
                    tag: isEn ? 'Report Status' : 'Status Laporan',
                    metadata: {
                        reportId: rep.id,
                        status: rep.status,
                        type: rep.type,
                    },
                });
            }
        }
    }
    catch (err) {
        console.warn('Gagal memuat notifikasi laporan pengguna:', err);
    }
    // Urutkan berdasarkan waktu terbaru
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
