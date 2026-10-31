import { useMemo, useState } from 'react';
import { formatIDR, formatShortDate, monthKey, monthLabel, todayISO } from '../lib/money';
import { INCOME_SOURCES, END_SAVINGS_WALLET_ID } from '../lib/state';
import { applyDestination } from '../lib/destination';
import { deleteReceipt, saveReceipt } from '../lib/receipts';
import { uid } from '../lib/id';
import { useI18n } from '../lib/i18n';
import { MoneyInput } from './MoneyInput';
import { ReceiptView } from './ReceiptView';
import { CustomSelect } from './CustomSelect';
import { ICON_CLOSE } from './icons';
const SOURCES = INCOME_SOURCES;
function destinationLabel(state, dest) {
    if (!dest)
        return null;
    if (dest.kind === 'jajan')
        return 'Uang jajan';
    if (dest.kind === 'pot')
        return 'Saku Tabungan';
    return state.wallets.find((wallet) => wallet.id === dest.walletId)?.name ?? null;
}
function destinationKey(dest) {
    if (!dest)
        return '';
    return dest.kind === 'wallet' ? `wallet:${dest.walletId}` : dest.kind;
}
function parseDestination(key) {
    if (key === 'jajan' || key === 'pot')
        return { kind: key };
    if (key.startsWith('wallet:') && key.slice(7) !== '')
        return { kind: 'wallet', walletId: key.slice(7) };
    return undefined;
}
export function IncomePanel({ state, update, notify }) {
    const { t, language } = useI18n();
    const [date, setDate] = useState(todayISO());
    const [source, setSource] = useState(SOURCES[0]);
    const [amount, setAmount] = useState(0);
    const [destKey, setDestKey] = useState('jajan');
    const [editingId, setEditingId] = useState(null);
    const [receiptId, setReceiptId] = useState(null);
    const [receiptError, setReceiptError] = useState('');
    const [query, setQuery] = useState('');
    const [filterMonth, setFilterMonth] = useState('all');
    const [timeRange, setTimeRange] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const manualTotal = state.incomes.reduce((sum, item) => sum + item.amount, 0);
    const months = useMemo(() => {
        const keys = new Set(state.incomes.map((item) => monthKey(item.date)));
        return [...keys].sort().reverse();
    }, [state.incomes]);
    const visible = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        const nowISO = todayISO();
        const thisMonth = monthKey(nowISO);
        const list = state.incomes.filter((item) => {
            if (filterMonth !== 'all' && monthKey(item.date) !== filterMonth)
                return false;
            if (timeRange === 'this_month' && monthKey(item.date) !== thisMonth)
                return false;
            if (timeRange === 'last_7_days') {
                const itemDate = new Date(item.date);
                const nowMs = Date.now();
                const diffMs = nowMs - itemDate.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays < 0 || diffDays > 7)
                    return false;
            }
            if (keyword) {
                const dest = destinationLabel(state, item.destination) ?? '';
                const haystack = `${item.source} ${dest} ${item.amount} ${formatIDR(item.amount)}`.toLowerCase();
                if (!haystack.includes(keyword))
                    return false;
            }
            return true;
        });
        return list.sort((a, b) => {
            if (sortBy === 'amount')
                return b.amount - a.amount;
            if (sortBy === 'amount_asc')
                return a.amount - b.amount;
            if (sortBy === 'date_asc')
                return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
            return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
        });
    }, [state, filterMonth, timeRange, query, sortBy]);
    const totalVisible = visible.reduce((sum, item) => sum + item.amount, 0);
    const hasActiveFilter = query !== '' || filterMonth !== 'all' || timeRange !== 'all';
    const resetForm = () => {
        setDate(todayISO());
        setSource(SOURCES[0]);
        setAmount(0);
        setDestKey('jajan');
        setEditingId(null);
        setReceiptId(null);
        setReceiptError('');
    };
    const submit = (event) => {
        event.preventDefault();
        if (amount <= 0)
            return;
        const label = source.trim() || SOURCES[0];
        const destination = parseDestination(destKey);
        if (editingId) {
            update((s) => {
                const previous = s.incomes.find((item) => item.id === editingId);
                if (!previous)
                    return s;
                // edit = delta: balik efek lama, terapkan efek baru
                let next = applyDestination(s, previous.destination, -previous.amount);
                next = applyDestination(next, destination, amount);
                return {
                    ...next,
                    incomes: next.incomes.map((item) => item.id === editingId
                        ? { ...item, date, source: label, amount, destination, receiptId: receiptId ?? undefined }
                        : item),
                };
            });
        }
        else {
            const income = {
                id: uid('inc'),
                date,
                source: label,
                amount,
                destination,
                receiptId: receiptId ?? undefined,
            };
            update((s) => applyDestination({ ...s, incomes: [income, ...s.incomes] }, destination, amount));
        }
        resetForm();
    };
    const startEdit = (income) => {
        setEditingId(income.id);
        setDate(income.date);
        setSource(income.source);
        setAmount(income.amount);
        setDestKey(destinationKey(income.destination));
        setReceiptId(income.receiptId ?? null);
        setReceiptError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const remove = (id) => {
        const index = state.incomes.findIndex((item) => item.id === id);
        const target = state.incomes[index];
        if (!target)
            return;
        update((s) => {
            const rest = s.incomes.filter((item) => item.id !== id);
            // hapus = balik efeknya
            return applyDestination({ ...s, incomes: rest }, target.destination, -target.amount);
        });
        if (target.receiptId)
            void deleteReceipt(target.receiptId);
        if (editingId === id)
            resetForm();
        notify('Pemasukan dihapus.', {
            undo: () => update((s) => {
                const next = [...s.incomes];
                next.splice(Math.min(index, next.length), 0, { ...target, receiptId: undefined });
                return applyDestination({ ...s, incomes: next }, target.destination, target.amount);
            }),
        });
    };
    return (<section className="card">
      <header className="card-head">
        <h2>{language === 'en' ? 'Other Income' : 'Pemasukan Lain'}</h2>
        <span className="muted small">{language === 'en' ? 'total' : 'total'} {formatIDR(manualTotal)}</span>
      </header>

      <p className="muted small">
        {language === 'en'
            ? 'Your allowance is distributed evenly per day and automatically recorded as income. Here you can add other income such as bonuses or earnings.'
            : 'Uang jajan dibagi rata per hari dan otomatis tercatat sebagai pemasukan. Di sini kamu menambah pemasukan lain seperti uang lebaran atau hasil kerja.'}
      </p>

      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="inc-date">{t('income.date')}</label>
          <input id="inc-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
        </div>
        <div className="field">
          <label htmlFor="inc-source">{t('income.sourceLabel')}</label>
          <CustomSelect id="inc-source" className="input" value={source} onChange={(e) => setSource(e.target.value)} title={language === 'en' ? 'Select Income Source' : 'Pilih Sumber Pemasukan'}>
            {!SOURCES.includes(source) && <option value={source}>{source}</option>}
            {SOURCES.map((item) => (<option key={item} value={item}>
                {item}
              </option>))}
          </CustomSelect>
        </div>
        <div className="field">
          <label htmlFor="inc-amount">{t('income.amountLabel')}</label>
          <MoneyInput value={amount} onValueChange={setAmount} id="inc-amount"/>
        </div>
        <div className="field">
          <label htmlFor="inc-dest">{t('income.destLabel')}</label>
          <CustomSelect id="inc-dest" className="input" value={destKey} onChange={(e) => setDestKey(e.target.value)} title={language === 'en' ? 'Select Income Destination' : 'Pilih Tujuan Pemasukan'}>
            <option value="jajan">{language === 'en' ? 'Pocket money budget' : 'Uang jajan'}</option>
            <option value="pot">{language === 'en' ? 'Savings Wallet' : 'Saku Tabungan'}</option>
            {state.wallets
            .filter((wallet) => wallet.id !== END_SAVINGS_WALLET_ID)
            .map((wallet) => (<option key={wallet.id} value={`wallet:${wallet.id}`}>
                  {wallet.name}
                </option>))}
          </CustomSelect>
        </div>
        <div className="field">
          <label htmlFor="inc-receipt">{language === 'en' ? 'Receipt (optional)' : 'Bukti (opsional)'}</label>
          <input id="inc-receipt" className="input" type="file" accept="image/*" onChange={(e) => {
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
                const previous = editingId ? state.incomes.find((item) => item.id === editingId)?.receiptId : undefined;
                if (previous && previous !== receiptId)
                    void deleteReceipt(previous);
                setReceiptId(null);
            }}>
                {language === 'en' ? 'Detach' : 'Lepas'}
              </button>
            </div>)}
          {receiptError && <span className="text-danger small">{receiptError}</span>}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn" disabled={amount <= 0}>
            {editingId ? t('income.saveChange') : (language === 'en' ? 'Add income' : 'Tambah pemasukan')}
          </button>
          {editingId && (<button type="button" className="btn btn-ghost" onClick={resetForm}>
              {t('income.cancel')}
            </button>)}
        </div>
      </form>

      <div className="filter-panel-card">
        <div className="filter-row">
          <div className="search-input-wrap">
            <input className="input input-search" placeholder={language === 'en' ? 'Search source or amount…' : 'Cari sumber atau nominal…'} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('income.searchAria')}/>
            {query && (<button type="button" className="search-clear-btn" onClick={() => setQuery('')} aria-label={language === 'en' ? 'Clear search' : 'Bersihkan pencarian'} title={language === 'en' ? 'Clear keywords' : 'Hapus kata kunci'}>
                {ICON_CLOSE}
              </button>)}
          </div>
          <CustomSelect className="input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filter bulan" title={language === 'en' ? 'Filter Month' : 'Filter Bulan'}>
            <option value="all">{language === 'en' ? 'All months' : 'Semua bulan'}</option>
            {months.map((key) => (<option key={key} value={key}>
                {monthLabel(key)}
              </option>))}
          </CustomSelect>
          <CustomSelect className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Urutan" title={language === 'en' ? 'Sort Order' : 'Urutan Catatan'}>
            <option value="date">{t('expenses.sortNewest')}</option>
            <option value="date_asc">{t('expenses.sortOldest')}</option>
            <option value="amount">{t('expenses.sortLargest')}</option>
            <option value="amount_asc">{t('expenses.sortSmallest')}</option>
          </CustomSelect>
        </div>

        <div className="quick-filter-chips">
          <button type="button" className={`filter-chip${timeRange === 'all' ? ' filter-chip-active' : ''}`} onClick={() => setTimeRange('all')}>
            {t('expenses.rangeAll')}
          </button>
          <button type="button" className={`filter-chip${timeRange === 'this_month' ? ' filter-chip-active' : ''}`} onClick={() => setTimeRange('this_month')}>
            {t('expenses.rangeThisMonth')}
          </button>
          <button type="button" className={`filter-chip${timeRange === 'last_7_days' ? ' filter-chip-active' : ''}`} onClick={() => setTimeRange('last_7_days')}>
            {t('expenses.range7Days')}
          </button>
        </div>

        <div className="filter-summary-row">
          <span className="muted small">
            {language === 'en'
            ? `Showing ${visible.length} of ${state.incomes.length} entries · Total `
            : `Menampilkan ${visible.length} dari ${state.incomes.length} catatan · Total `}
            <strong>{formatIDR(totalVisible)}</strong>
          </span>
          {hasActiveFilter && (<button type="button" className="btn btn-ghost btn-sm filter-reset-btn" onClick={() => {
                setQuery('');
                setFilterMonth('all');
                setTimeRange('all');
            }}>
              Reset Filter
            </button>)}
        </div>
      </div>

      <ul className="tx-list">
        {visible.map((item) => (<li key={item.id} className={`tx${editingId === item.id ? ' tx-active' : ''}`}>
            <span className="tx-dot" style={{ background: '#2f9e44' }}/>
            <span className="tx-main">
              <strong>{item.source}</strong>
              <span className="muted small">
                {formatShortDate(item.date)}
                {destinationLabel(state, item.destination) && ` · ${language === 'en' ? 'to' : 'ke'} ${destinationLabel(state, item.destination)}`}
              </span>
            </span>
            <span className="tx-amount tx-in tabular-nums">
              <span className="tx-kind-badge tx-kind-in" aria-label={language === 'en' ? 'Income' : 'Pemasukan'}>
                <span aria-hidden="true">↑</span> {language === 'en' ? 'In' : 'Masuk'}
              </span>
              +{formatIDR(item.amount)}
            </span>
            <span className="tx-actions">
              {item.receiptId && <ReceiptView id={item.receiptId}/>}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>
                {language === 'en' ? 'Edit' : 'Ubah'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(item.id)}>
                {language === 'en' ? 'Delete' : 'Hapus'}
              </button>
            </span>
          </li>))}
        {visible.length === 0 && (<li className="empty empty-state-box">
            <span className="empty-state-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v12M16 10H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H8"/>
              </svg>
            </span>
            <strong>{language === 'en' ? 'No income entries yet' : 'Belum ada catatan pemasukan'}</strong>
            <span className="muted small">
              {query || filterMonth !== 'all' || timeRange !== 'all'
                ? (language === 'en' ? 'No income matches your filter.' : 'Tidak ada pemasukan yang cocok dengan filter kamu.')
                : (language === 'en' ? 'Log your incoming funds, salary, or transfer with the [+ Income] button above!' : 'Catat uang jajan masuk, gaji, atau transferan dengan tombol [+ Pemasukan] di atas!')}
            </span>
          </li>)}
      </ul>
    </section>);
}
