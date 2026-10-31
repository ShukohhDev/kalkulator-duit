import { useEffect, useState } from 'react';
import { formatIDR } from '../lib/money';
import { loadPrefs, savePrefs } from '../lib/prefs';
import { onRateUpdate, refreshUsdRate } from '../lib/rates';
import { uid } from '../lib/id';
import { END_SAVINGS_WALLET_ID } from '../lib/state';
import { translate, useI18n } from '../lib/i18n';
import { MoneyInput } from './MoneyInput';
function formatUSD(value) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
function formatRateAt(at, isEn) {
    const stamp = Date.parse(at);
    if (!Number.isFinite(stamp))
        return '';
    return new Date(stamp).toLocaleDateString(isEn ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function DompetPanel({ state, update, lang: propLang }) {
    const { language } = useI18n();
    const lang = propLang ?? language;
    const isEn = lang === 'en';
    const [currency, setCurrency] = useState(() => loadPrefs().walletCurrency);
    const [rateInfo, setRateInfo] = useState(() => {
        const prefs = loadPrefs();
        return { rate: prefs.usdRate, at: prefs.usdRateAt };
    });
    useEffect(() => onRateUpdate(() => {
        const prefs = loadPrefs();
        setRateInfo({ rate: prefs.usdRate, at: prefs.usdRateAt });
    }), []);
    const total = state.wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    const inUsd = currency === 'usd' && rateInfo.rate > 0;
    const pickCurrency = (next) => {
        setCurrency(next);
        savePrefs({ walletCurrency: next });
        if (next === 'usd')
            void refreshUsdRate();
    };
    const addWallet = () => {
        update((s) => ({
            ...s,
            wallets: [
                ...s.wallets,
                {
                    id: uid('wallet'),
                    name: isEn ? `Wallet ${s.wallets.length + 1}` : `Dompet ${s.wallets.length + 1}`,
                    balance: 0,
                },
            ],
        }));
    };
    const patchWallet = (id, patch) => {
        update((s) => {
            const isEnd = id === END_SAVINGS_WALLET_ID;
            const nextEndSavings = isEnd && patch.balance !== undefined ? Math.max(0, patch.balance) : s.endSavings;
            const nextWallets = s.wallets.map((wallet) => wallet.id === id
                ? {
                    ...wallet,
                    ...patch,
                    balance: patch.balance !== undefined ? Math.max(0, patch.balance) : wallet.balance,
                }
                : wallet);
            return {
                ...s,
                endSavings: nextEndSavings,
                wallets: nextWallets,
            };
        });
    };
    const removeWallet = (id) => {
        if (id === END_SAVINGS_WALLET_ID)
            return;
        update((s) => ({
            ...s,
            wallets: s.wallets.filter((wallet) => wallet.id !== id),
            endSavingsTargetWalletId: s.endSavingsTargetWalletId === id ? END_SAVINGS_WALLET_ID : s.endSavingsTargetWalletId,
        }));
    };
    return (<section className="card">
      <header className="card-head">
        <h2>{translate('dompet.title', lang)}</h2>
        <div className="profile-chips">
          <button type="button" className={`nav-chip${currency === 'idr' ? ' nav-chip-on' : ''}`} onClick={() => pickCurrency('idr')}>
            Rp
          </button>
          <button type="button" className={`nav-chip${currency === 'usd' ? ' nav-chip-on' : ''}`} onClick={() => pickCurrency('usd')}>
            USD
          </button>
        </div>
      </header>

      <div className="wallet-total">
        <span className="muted small">{translate('dompet.totalAsset', lang)}</span>
        <strong className="wallet-total-value">{inUsd ? formatUSD(total / rateInfo.rate) : formatIDR(total)}</strong>
        {inUsd && (<span className="muted small wallet-rate" data-testid="rate-note">
            1 USD = Rp {Math.round(rateInfo.rate).toLocaleString('id-ID')} ·{' '}
            {rateInfo.at ? translate('dompet.rateAuto', lang, { at: formatRateAt(rateInfo.at, isEn) }) : translate('dompet.rateOffline', lang)}
          </span>)}
      </div>

      <div className="goal-list">
        {state.wallets.map((wallet) => {
            const isEnd = wallet.id === END_SAVINGS_WALLET_ID;
            const isTarget = (state.endSavingsTargetWalletId ?? END_SAVINGS_WALLET_ID) === wallet.id;
            return (<article key={wallet.id} className="ob-row">
              <input className="input input-name" aria-label={isEn ? `Wallet name ${wallet.name}` : `Nama dompet ${wallet.name}`} value={wallet.name} readOnly={isEnd} title={isEnd
                    ? isEn
                        ? 'Wallet automatically linked to End-of-period Savings'
                        : 'Dompet otomatis terhubung ke Tabungan Akhir Periode'
                    : undefined} onChange={(e) => patchWallet(wallet.id, { name: e.target.value })}/>
              <MoneyInput id={`w-bal-${wallet.id}`} value={wallet.balance} onValueChange={(value) => patchWallet(wallet.id, { balance: value })}/>
              <div className="ob-actions">
                {isEnd ? (<span className="badge" title={isTarget
                        ? isEn
                            ? 'Balance automatically syncs with End-of-period Savings'
                            : 'Saldo otomatis sinkron dengan Tabungan Akhir Periode'
                        : isEn
                            ? 'Special wallet for End-of-period Savings'
                            : 'Dompet khusus Tabungan Akhir Periode'} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    {isTarget ? translate('dompet.autoBadge', lang) : translate('dompet.specialBadge', lang)}
                  </span>) : (<>
                    {isTarget && (<span className="badge badge-accent" title={isEn
                            ? 'This wallet is selected as destination for End-of-period Savings'
                            : 'Dompet ini dipilih sebagai tujuan alokasi Tabungan Akhir Periode'} style={{ fontSize: '0.75rem', padding: '4px 8px', marginRight: 4 }}>
                        {translate('dompet.savingsTargetBadge', lang)}
                      </span>)}
                    <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeWallet(wallet.id)}>
                      {translate('dompet.deleteBtn', lang)}
                    </button>
                  </>)}
              </div>
            </article>);
        })}
        {state.wallets.length === 0 && (<p className="muted small">{translate('dompet.empty', lang)}</p>)}
      </div>

      <button type="button" className="btn btn-ghost" onClick={addWallet}>
        {translate('dompet.addBtn', lang)}
      </button>
    </section>);
}
