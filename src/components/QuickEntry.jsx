import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { INCOME_SOURCES, SAVINGS_CATEGORY, primaryGoal, isSavingsOrEmergencyCategory } from '../lib/state';
import { formatIDR, todayISO } from '../lib/money';
import { uid } from '../lib/id';
import { deleteReceipt, saveReceipt } from '../lib/receipts';
import { useI18n } from '../lib/i18n';
import { MoneyInput } from './MoneyInput';
import { CustomSelect } from './CustomSelect';
const CLOSE_ICON = (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18"/>
  </svg>);
export function QuickEntry({ mode, state, update, notify, onClose }) {
    const { language } = useI18n();
    const [date, setDate] = useState(todayISO());
    const allocatedCategories = useMemo(() => {
        const list = state.categories.filter((c) => c.ratio > 0 && !c.off);
        return list.length > 0 ? list : state.categories;
    }, [state.categories]);
    const [categoryId, setCategoryId] = useState(() => {
        const firstAllocated = state.categories.find((c) => c.ratio > 0 && !c.off);
        return firstAllocated?.id ?? state.categories[0]?.id ?? 'makan';
    });
    useEffect(() => {
        if (!allocatedCategories.some((c) => c.id === categoryId)) {
            if (allocatedCategories[0]) {
                setCategoryId(allocatedCategories[0].id);
            }
        }
    }, [allocatedCategories, categoryId]);
    const [source, setSource] = useState(INCOME_SOURCES[0]);
    const [note, setNote] = useState('');
    const [amount, setAmount] = useState(0);
    const [walletId, setWalletId] = useState('');
    const [receiptId, setReceiptId] = useState(null);
    const [receiptError, setReceiptError] = useState('');
    const rootRef = useRef(null);
    useLayoutEffect(() => {
        const section = rootRef.current;
        const anchor = section?.parentElement;
        const button = anchor?.querySelector('button');
        if (!section || !anchor || !button)
            return;
        const place = () => {
            const rect = button.getBoundingClientRect();
            const box = anchor.getBoundingClientRect();
            const width = Math.min(380, window.innerWidth - 24);
            const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
            section.style.left = `${left - box.left}px`;
            section.style.right = 'auto';
            section.style.width = `${width}px`;
            const availableHeight = Math.max(260, window.innerHeight - rect.bottom - 16);
            section.style.maxHeight = `${availableHeight}px`;
            section.style.overflowY = 'auto';
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, { passive: true });
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place);
        };
    }, []);
    const submit = (event) => {
        event.preventDefault();
        if (amount <= 0)
            return;
        if (mode === 'expense') {
            const isSavings = isSavingsOrEmergencyCategory(categoryId, state.categories);
            const expense = {
                id: uid('exp'),
                date,
                categoryId,
                note: note.trim(),
                amount,
                goalId: categoryId === SAVINGS_CATEGORY ? primaryGoal(state.goals)?.id : undefined,
                receiptId: receiptId ?? undefined,
                walletId: walletId || undefined,
            };
            update((s) => {
                let nextWallets = s.wallets;
                if (walletId) {
                    nextWallets = s.wallets.map((w) => w.id === walletId ? { ...w, balance: Math.max(0, w.balance - amount) } : w);
                }
                return {
                    ...s,
                    endSavings: isSavings ? Math.max(0, s.endSavings - amount) : s.endSavings,
                    wallets: nextWallets,
                    expenses: [expense, ...s.expenses],
                };
            });
            notify(language === 'en' ? 'Expense recorded' : 'Pengeluaran dicatat');
            setReceiptId(null);
            setWalletId('');
        }
        else {
            const income = { id: uid('inc'), date, source, amount };
            update((s) => ({ ...s, incomes: [income, ...s.incomes] }));
            notify(language === 'en' ? 'Income recorded' : 'Pemasukan dicatat');
        }
        setAmount(0);
    };
    return (<section ref={rootRef} className="card quick-form quick-pop">
      <header className="card-head">
        <h2>
          {mode === 'expense'
            ? language === 'en' ? 'Log Expense' : 'Catat Pengeluaran'
            : language === 'en' ? 'Log Income' : 'Catat Pemasukan'}
        </h2>
        <button type="button" className="btn btn-ghost btn-sm window-close" onClick={onClose} aria-label={language === 'en' ? 'Close quick entry' : 'Tutup form catat cepat'} title={language === 'en' ? 'Close' : 'Tutup'}>
          {CLOSE_ICON}
        </button>
      </header>

      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="qk-date">{language === 'en' ? 'Date' : 'Tanggal'}</label>
          <input id="qk-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
        </div>

        {mode === 'expense' ? (<div className="field">
            <label htmlFor="qk-cat">{language === 'en' ? 'Category' : 'Kategori'}</label>
            <CustomSelect id="qk-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} title={language === 'en' ? 'Select Category' : 'Pilih Kategori'}>
              {allocatedCategories.map((category) => (<option key={category.id} value={category.id}>
                  {category.name}
                  {category.ratio > 0 ? ` (${Math.round(category.ratio * 100)}%)` : ''}
                </option>))}
            </CustomSelect>
            {isSavingsOrEmergencyCategory(categoryId, state.categories) && (<p className="small" style={{ color: 'var(--primary)', margin: '4px 0 0 0' }}>
                {language === 'en'
                    ? `Deducts End-of-Period Savings (${formatIDR(state.endSavings)}).`
                    : `Memotong Tabungan Akhir Periode (${formatIDR(state.endSavings)}).`}
              </p>)}
          </div>) : (<div className="field">
            <label htmlFor="qk-source">{language === 'en' ? 'Source' : 'Sumber'}</label>
            <CustomSelect id="qk-source" className="input" value={source} onChange={(e) => setSource(e.target.value)} title={language === 'en' ? 'Select Source' : 'Pilih Sumber'}>
              {INCOME_SOURCES.map((item) => (<option key={item} value={item}>
                  {item}
                </option>))}
            </CustomSelect>
          </div>)}

        {mode === 'expense' && (<div className="field">
            <label htmlFor="qk-wallet">{language === 'en' ? 'Wallet / Source' : 'Sumber dana / Dompet'}</label>
            <CustomSelect id="qk-wallet" className="input" value={walletId} onChange={(e) => setWalletId(e.target.value)} title={language === 'en' ? 'Select Wallet' : 'Pilih Dompet / E-Wallet'}>
              <option value="">{language === 'en' ? 'Do not deduct wallet' : 'Tanpa potong dompet'}</option>
              {state.wallets.map((wallet) => (<option key={wallet.id} value={wallet.id}>
                  {wallet.name} ({language === 'en' ? 'Balance:' : 'Saldo:'} {formatIDR(wallet.balance)})
                </option>))}
            </CustomSelect>
          </div>)}

        {mode === 'expense' && (<div className="field">
            <label htmlFor="qk-note">{language === 'en' ? 'Description' : 'Untuk apa'}</label>
            <input id="qk-note" className="input" placeholder={language === 'en' ? 'e.g. lunch at cafeteria' : 'mis. nasi goreng di kantin'} value={note} onChange={(e) => setNote(e.target.value)}/>
          </div>)}

        <div className="field">
          <label htmlFor="qk-amount">{language === 'en' ? 'Amount' : 'Nominal'}</label>
          <MoneyInput value={amount} onValueChange={setAmount} id="qk-amount" autoFocus/>
        </div>

        {mode === 'expense' && (<div className="field">
            <label htmlFor="qk-receipt">{language === 'en' ? 'Receipt (optional)' : 'Bukti (opsional)'}</label>
            <input id="qk-receipt" className="input" type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file)
                    return;
                setReceiptError('');
                saveReceipt(file)
                    .then((id) => setReceiptId(id))
                    .catch(() => setReceiptError(language === 'en' ? 'Failed to save receipt.' : 'Gagal menyimpan bukti di browser.'));
            }}/>
            {receiptId && (<div className="inline-form">
                <span className="chip">{language === 'en' ? 'Receipt attached' : 'Bukti terlampir'}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                    void deleteReceipt(receiptId);
                    setReceiptId(null);
                }}>
                  {language === 'en' ? 'Remove' : 'Lepas'}
                </button>
              </div>)}
            {receiptError && <span className="text-danger small">{receiptError}</span>}
          </div>)}

        <div className="form-actions">
          <button type="submit" className="btn" disabled={amount <= 0}>
            {mode === 'expense'
            ? language === 'en' ? 'Save expense' : 'Simpan pengeluaran'
            : language === 'en' ? 'Save income' : 'Simpan pemasukan'}
          </button>
        </div>
      </form>
    </section>);
}
