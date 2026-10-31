import { useState } from 'react';
import { formatIDR, todayISO } from '../lib/money';
import { SAVINGS_CATEGORY } from '../lib/state';
import { uid } from '../lib/id';
import { translate, useI18n } from '../lib/i18n';
import { MoneyInput } from './MoneyInput';
import { ProgressBar } from './ProgressBar';
export function WishlistPanel({ state, derived, update, lang: propLang }) {
    const { language } = useI18n();
    const lang = propLang ?? language;
    const isEn = lang === 'en';
    const [deposits, setDeposits] = useState({});
    const addItem = () => {
        update((s) => ({
            ...s,
            wishlist: [
                ...s.wishlist,
                {
                    id: uid('wish'),
                    name: isEn ? `Wishlist ${s.wishlist.length + 1}` : `Incaran ${s.wishlist.length + 1}`,
                    price: 0,
                    saved: 0,
                },
            ],
        }));
    };
    const patchItem = (id, patch) => {
        update((s) => ({ ...s, wishlist: s.wishlist.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
    };
    const removeItem = (id) => {
        update((s) => ({ ...s, wishlist: s.wishlist.filter((item) => item.id !== id) }));
    };
    const setor = (id) => {
        const amount = deposits[id] ?? 0;
        if (amount <= 0)
            return;
        const item = state.wishlist.find((wish) => wish.id === id);
        update((s) => ({
            ...s,
            expenses: [
                {
                    id: uid('exp'),
                    date: todayISO(),
                    categoryId: SAVINGS_CATEGORY,
                    note: isEn
                        ? `Deposit ${item?.name ?? 'wishlist'}`.trim()
                        : `Setoran ${item?.name ?? 'incaran'}`.trim(),
                    amount,
                    wishlistId: id,
                },
                ...s.expenses,
            ],
        }));
        setDeposits((prev) => ({ ...prev, [id]: 0 }));
    };
    return (<section className="card">
      <header className="card-head">
        <h2>{translate('wishlist.title', lang)}</h2>
        <span className="muted small">{translate('wishlist.sub', lang)}</span>
      </header>

      <div className="goal-list">
        {state.wishlist.map((item) => {
            const logged = derived.wishlistSavings[item.id] ?? 0;
            const effective = item.saved + logged;
            const percent = item.price > 0 ? Math.min(100, Math.round((effective / item.price) * 100)) : 0;
            const remaining = Math.max(0, item.price - effective);
            return (<article key={item.id} className="goal">
              <header className="goal-head">
                <input className="input input-name" value={item.name} aria-label={isEn ? 'Wishlist item name' : 'Nama incaran'} onChange={(e) => patchItem(item.id, { name: e.target.value })}/>
                <div className="goal-head-actions">
                  <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeItem(item.id)}>
                    {translate('wishlist.deleteBtn', lang)}
                  </button>
                </div>
              </header>

              <div className="form-grid form-grid-2">
                <div className="field">
                  <label>{isEn ? 'Item price (Rp)' : 'Harga barang (Rp)'}</label>
                  <MoneyInput value={item.price} onValueChange={(value) => patchItem(item.id, { price: value })}/>
                </div>
                <div className="field">
                  <label>{isEn ? 'Initial balance (optional)' : 'Saldo awal (opsional)'}</label>
                  <MoneyInput value={item.saved} onValueChange={(value) => patchItem(item.id, { saved: value })}/>
                </div>
              </div>

              <div className="goal-progress">
                <ProgressBar value={effective} max={item.price}/>
                <span className="muted small">
                  {formatIDR(effective)} / {formatIDR(item.price)} ({percent}%)
                  {item.price > 0
                    ? remaining > 0
                        ? isEn
                            ? ` · ${formatIDR(remaining)} remaining`
                            : ` · kurang ${formatIDR(remaining)} lagi`
                        : isEn
                            ? ' · yay enough saved, ready to buy!'
                            : ' · hore udah cukup, tinggal beli!'
                    : ''}
                </span>
                {logged > 0 && (<span className="muted small">
                    {isEn
                        ? `= initial balance ${formatIDR(item.saved)} + recorded deposits ${formatIDR(logged)}`
                        : `= saldo awal ${formatIDR(item.saved)} + setoran tercatat ${formatIDR(logged)}`}
                  </span>)}
              </div>

              <div className="inline-form">
                <MoneyInput value={deposits[item.id] ?? 0} onValueChange={(value) => setDeposits((prev) => ({ ...prev, [item.id]: value }))} placeholder={isEn ? 'How much to deposit?' : 'Mau setor berapa?'}/>
                <button type="button" className="btn btn-sm" disabled={(deposits[item.id] ?? 0) <= 0} onClick={() => setor(item.id)}>
                  {translate('wishlist.depositBtn', lang)}
                </button>
              </div>
            </article>);
        })}
      </div>

      <button type="button" className="btn btn-ghost" onClick={addItem}>
        {translate('wishlist.addBtn', lang)}
      </button>
      {state.wishlist.length === 0 && (<p className="muted small">{translate('wishlist.empty', lang)}</p>)}
    </section>);
}
