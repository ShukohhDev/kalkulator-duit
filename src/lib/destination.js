import { END_SAVINGS_WALLET_ID, syncEndSavingsWallet } from './state';
const clamp = (value) => Math.max(0, value);
// amount positif = setor masuk, negatif = dibalik (hapus/urungkan/edit delta)
export function applyDestination(state, dest, amount) {
    if (!dest || amount === 0)
        return state;
    if (dest.kind === 'jajan') {
        const allowance = clamp(state.allowance + amount);
        return {
            ...state,
            allowance,
            allowanceMax: state.allowanceMax > 0 ? Math.max(state.allowanceMax, allowance) : state.allowanceMax,
        };
    }
    if (dest.kind === 'pot') {
        const nextEnd = clamp(state.endSavings + amount);
        return {
            ...state,
            endSavings: nextEnd,
            wallets: syncEndSavingsWallet(state.wallets, nextEnd),
        };
    }
    const exists = state.wallets.some((wallet) => wallet.id === dest.walletId);
    if (!exists)
        return state;
    const isEnd = dest.walletId === END_SAVINGS_WALLET_ID;
    const nextEnd = isEnd ? clamp(state.endSavings + amount) : state.endSavings;
    const nextWallets = state.wallets.map((wallet) => wallet.id === dest.walletId ? { ...wallet, balance: clamp(wallet.balance + amount) } : wallet);
    return {
        ...state,
        endSavings: nextEnd,
        wallets: isEnd ? syncEndSavingsWallet(nextWallets, nextEnd) : nextWallets,
    };
}
