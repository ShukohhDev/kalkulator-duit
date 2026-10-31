import { useState } from 'react';
import { formatIDR } from '../lib/money';
import { billPaidThisMonth, billRemainingThisMonth, daysUntilDue, dueDateLabel, dueLabel, isBillFullyPaidThisMonth, markBillPaid, markDebtPaid, nowDate, } from '../lib/obligations';
import { uid } from '../lib/id';
import { buildICS } from '../lib/ics';
import { END_SAVINGS_WALLET_ID } from '../lib/state';
import { useI18n } from '../lib/i18n';
import { MiniCalendar } from './MiniCalendar';
import { MoneyInput } from './MoneyInput';
import { ProgressBar } from './ProgressBar';
import { CustomSelect } from './CustomSelect';
function getSourceBalance(state, source) {
    if (source === 'pot')
        return state.endSavings;
    if (source.startsWith('wallet:')) {
        const targetId = source.slice(7);
        const wallet = state.wallets.find((w) => w.id === targetId);
        return wallet?.balance ?? 0;
    }
    return Infinity;
}
function getSourceName(state, source) {
    if (source === 'pot')
        return 'Saku Tabungan';
    if (source.startsWith('wallet:')) {
        const targetId = source.slice(7);
        const wallet = state.wallets.find((w) => w.id === targetId);
        return wallet ? wallet.name : 'Dompet';
    }
    return '';
}
export function ObligationsPanel({ state, update, notify }) {
    const { language } = useI18n();
    const [billName, setBillName] = useState('');
    const [billAmount, setBillAmount] = useState(0);
    const [billDay, setBillDay] = useState(1);
    const [payingBillId, setPayingBillId] = useState(null);
    const [payNominal, setPayNominal] = useState(0);
    const [paySource, setPaySource] = useState('none');
    const [debtName, setDebtName] = useState('');
    const [debtTotal, setDebtTotal] = useState(0);
    const [debtInstallment, setDebtInstallment] = useState(0);
    const [debtDay, setDebtDay] = useState(1);
    const [payingDebtId, setPayingDebtId] = useState(null);
    const [debtPayNominal, setDebtPayNominal] = useState(0);
    const [debtPaySource, setDebtPaySource] = useState('none');
    const [obView, setObView] = useState('all');
    const now = nowDate();
    const exportIcs = () => {
        try {
            const url = URL.createObjectURL(new Blob([buildICS(state)], { type: 'text/calendar;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'kewajiban.ics';
            link.click();
            URL.revokeObjectURL(url);
            notify(language === 'en' ? 'Obligations calendar downloaded (.ics).' : 'Kalender kewajiban diunduh (.ics).');
        }
        catch {
            notify(language === 'en' ? 'Failed to create .ics file.' : 'Gagal membuat file .ics.', { error: true });
        }
    };
    const addBill = (event) => {
        event.preventDefault();
        const name = billName.trim();
        if (!name || billAmount <= 0)
            return;
        update((s) => ({
            ...s,
            bills: [...s.bills, { id: uid('bill'), name, amount: billAmount, dueDay: billDay }],
        }));
        setBillName('');
        setBillAmount(0);
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            void Notification.requestPermission();
        }
    };
    const openPayBill = (bill) => {
        const remaining = billRemainingThisMonth(bill, now);
        setPayingBillId(bill.id);
        setPayNominal(remaining);
        setPaySource('none');
    };
    const cancelPayBill = () => {
        setPayingBillId(null);
        setPayNominal(0);
        setPaySource('none');
    };
    const confirmPayBill = (bill) => {
        if (payNominal <= 0)
            return;
        const remaining = billRemainingThisMonth(bill, now);
        const actualPay = Math.min(payNominal, remaining);
        const sourceKey = paySource === 'none' ? undefined : paySource;
        update((s) => markBillPaid(s, bill, actualPay, now, sourceKey));
        const nextRemaining = remaining - actualPay;
        const sourceLabel = sourceKey ? ` via ${getSourceName(state, sourceKey)}` : '';
        if (nextRemaining <= 0) {
            notify(language === 'en'
                ? `Bill ${bill.name} paid in full this month (${formatIDR(actualPay)}${sourceLabel}).`
                : `Tagihan ${bill.name} lunas bulan ini (${formatIDR(actualPay)}${sourceLabel}).`);
        }
        else {
            notify(language === 'en'
                ? `Payment for ${bill.name} recorded (${formatIDR(actualPay)}${sourceLabel}). Remaining bill: ${formatIDR(nextRemaining)}.`
                : `Pembayaran ${bill.name} berhasil dicatat (${formatIDR(actualPay)}${sourceLabel}). Sisa tagihan: ${formatIDR(nextRemaining)}.`);
        }
        setPayingBillId(null);
        setPayNominal(0);
        setPaySource('none');
    };
    const removeBill = (id) => {
        if (payingBillId === id)
            cancelPayBill();
        const index = state.bills.findIndex((item) => item.id === id);
        const target = state.bills[index];
        if (!target)
            return;
        update((s) => ({ ...s, bills: s.bills.filter((item) => item.id !== id) }));
        notify(language === 'en' ? 'Bill deleted.' : 'Tagihan dihapus.', {
            undo: () => update((s) => {
                const next = [...s.bills];
                next.splice(Math.min(index, next.length), 0, target);
                return { ...s, bills: next };
            }),
        });
    };
    const addDebt = (event) => {
        event.preventDefault();
        const name = debtName.trim();
        if (!name || debtTotal <= 0 || debtInstallment <= 0)
            return;
        update((s) => ({
            ...s,
            debts: [
                ...s.debts,
                { id: uid('debt'), name, total: debtTotal, paid: 0, installment: debtInstallment, dueDay: debtDay },
            ],
        }));
        setDebtName('');
        setDebtTotal(0);
        setDebtInstallment(0);
    };
    const openPayDebt = (debt) => {
        const remaining = Math.max(0, debt.total - debt.paid);
        setPayingDebtId(debt.id);
        setDebtPayNominal(Math.min(debt.installment, remaining));
        setDebtPaySource('none');
    };
    const cancelPayDebt = () => {
        setPayingDebtId(null);
        setDebtPayNominal(0);
        setDebtPaySource('none');
    };
    const confirmPayDebt = (debt) => {
        if (debtPayNominal <= 0)
            return;
        const remaining = Math.max(0, debt.total - debt.paid);
        const actualPay = Math.min(debtPayNominal, remaining);
        const sourceKey = debtPaySource === 'none' ? undefined : debtPaySource;
        update((s) => markDebtPaid(s, debt, actualPay, sourceKey));
        const nextRemaining = remaining - actualPay;
        const sourceLabel = sourceKey ? ` via ${getSourceName(state, sourceKey)}` : '';
        if (nextRemaining <= 0) {
            notify(language === 'en'
                ? `Debt ${debt.name} paid off completely (${formatIDR(actualPay)}${sourceLabel}).`
                : `Utang ${debt.name} berhasil dilunasi (${formatIDR(actualPay)}${sourceLabel}).`);
        }
        else {
            notify(language === 'en'
                ? `Installment for ${debt.name} recorded (${formatIDR(actualPay)}${sourceLabel}). Remaining debt: ${formatIDR(nextRemaining)}.`
                : `Pembayaran angsuran ${debt.name} berhasil dicatat (${formatIDR(actualPay)}${sourceLabel}). Sisa utang: ${formatIDR(nextRemaining)}.`);
        }
        setPayingDebtId(null);
        setDebtPayNominal(0);
        setDebtPaySource('none');
    };
    const removeDebt = (id) => {
        if (payingDebtId === id)
            cancelPayDebt();
        const index = state.debts.findIndex((item) => item.id === id);
        const target = state.debts[index];
        if (!target)
            return;
        update((s) => ({ ...s, debts: s.debts.filter((item) => item.id !== id) }));
        notify(language === 'en' ? 'Debt deleted.' : 'Utang dihapus.', {
            undo: () => update((s) => {
                const next = [...s.debts];
                next.splice(Math.min(index, next.length), 0, target);
                return { ...s, debts: next };
            }),
        });
    };
    return (<div className="obligations-wrapper">
      <section className="card obligations-top-card">
        <header className="card-head">
          <div>
            <h2>{language === 'en' ? 'Obligations' : 'Kewajiban'}</h2>
            <p className="muted small" style={{ margin: '4px 0 0 0' }}>
              {language === 'en' ? 'track bills & debts so you never miss a due date' : 'pantau tagihan & cicilan biar gak kelupaan'}
            </p>
          </div>
          <div className="report-actions no-print">
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportIcs}>
              {language === 'en' ? 'Export .ics' : 'Ekspor .ics'}
            </button>
          </div>
        </header>
      </section>

      <div className="catat-mobile-switch" role="tablist" aria-label={language === 'en' ? 'Obligation view options' : 'Pilihan tampilan kewajiban'}>
        <button type="button" role="tab" aria-selected={obView === 'all'} className={`catat-switch-btn ${obView === 'all' ? 'active' : ''}`} onClick={() => setObView('all')}>
          {language === 'en' ? 'All' : 'Semua'}
        </button>
        <button type="button" role="tab" aria-selected={obView === 'bills'} className={`catat-switch-btn ${obView === 'bills' ? 'active' : ''}`} onClick={() => setObView('bills')}>
          {language === 'en' ? 'Recurring Bills' : 'Tagihan Rutin'}
        </button>
        <button type="button" role="tab" aria-selected={obView === 'debts'} className={`catat-switch-btn ${obView === 'debts' ? 'active' : ''}`} onClick={() => setObView('debts')}>
          {language === 'en' ? 'Active Debts' : 'Utang Berjalan'}
        </button>
      </div>

      <div className={`obligations-split-grid show-${obView}`}>
        {/* Kolom Kiri: Tagihan Rutin */}
        <section className="card ob-column ob-col-bills">
          <header className="card-head">
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>{language === 'en' ? 'Recurring Bills' : 'Tagihan rutin'}</h3>
              <span className="muted small">{state.bills.length} {language === 'en' ? (state.bills.length === 1 ? 'bill' : 'bills') : 'tagihan'}</span>
            </div>
          </header>
      <div className="goal-list">
        {state.bills.map((bill) => {
            const isPaid = isBillFullyPaidThisMonth(bill, now);
            const paidAmount = billPaidThisMonth(bill, now);
            const remaining = billRemainingThisMonth(bill, now);
            const days = daysUntilDue(bill.dueDay, now);
            const isPayingThis = payingBillId === bill.id;
            return (<article key={bill.id} className="ob-row">
              <div className="ob-main">
                <strong>{bill.name}</strong>
                {paidAmount > 0 && remaining > 0 && (<ProgressBar value={paidAmount} max={bill.amount}/>)}
                <span className="muted small">
                  {paidAmount > 0 && remaining > 0 ? (<>
                      {language === 'en'
                        ? `Paid ${formatIDR(paidAmount)} of ${formatIDR(bill.amount)} · left ${formatIDR(remaining)} · every ${bill.dueDay}th (${dueDateLabel(bill.dueDay, now, language)})`
                        : `Terbayar ${formatIDR(paidAmount)} dari ${formatIDR(bill.amount)} · sisa ${formatIDR(remaining)} · tiap tgl ${bill.dueDay} (${dueDateLabel(bill.dueDay, now, language)})`}
                    </>) : (<>
                      {formatIDR(bill.amount)} · {language === 'en' ? `every ${bill.dueDay}th` : `tiap tgl ${bill.dueDay}`} ({dueDateLabel(bill.dueDay, now, language)})
                    </>)}
                </span>
              </div>
              <span className={`ob-badge ${isPaid ? 'ob-badge-ok' : paidAmount > 0 ? 'ob-badge-warn' : days <= 3 ? 'ob-badge-due' : ''}`}>
                {isPaid
                    ? (language === 'en' ? 'Paid this month' : 'Lunas bulan ini')
                    : paidAmount > 0
                        ? (language === 'en' ? `Left ${formatIDR(remaining)}` : `Sisa ${formatIDR(remaining)}`)
                        : dueLabel(days, language)}
              </span>
              <div className="ob-actions">
                <button type="button" className="btn btn-sm" disabled={isPaid} onClick={() => (isPayingThis ? cancelPayBill() : openPayBill(bill))}>
                  {isPayingThis ? (language === 'en' ? 'Cancel' : 'Batal') : (language === 'en' ? 'Pay' : 'Bayar')}
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeBill(bill.id)}>
                  {language === 'en' ? 'Delete' : 'Hapus'}
                </button>
              </div>

              {isPayingThis && (<div className="ob-pay-drawer">
                  <div className="ob-pay-info">
                    <span className="small">
                      {language === 'en' ? 'Remaining bill:' : 'Sisa tagihan:'} <strong>{formatIDR(remaining)}</strong>
                    </span>
                    <span className="muted small">
                      {language === 'en' ? 'Select wallet and enter amount to pay' : 'Pilih dompet dan masukin nominal yang mau dibayar'}
                    </span>
                  </div>
                  <div className="ob-pay-input-row">
                    <div className="field ob-pay-field">
                      <label htmlFor={`pay-amount-${bill.id}`}>{language === 'en' ? 'Payment amount (Rp)' : 'Nominal bayar (Rp)'}</label>
                      <MoneyInput id={`pay-amount-${bill.id}`} value={payNominal} onValueChange={setPayNominal} placeholder={language === 'en' ? 'Enter payment amount…' : 'Masukkan nominal bayar…'} autoFocus/>
                    </div>
                    <div className="field ob-pay-field">
                      <label htmlFor={`pay-source-${bill.id}`}>{language === 'en' ? 'Payment source' : 'Sumber pembayaran'}</label>
                      <CustomSelect id={`pay-source-${bill.id}`} className="input" value={paySource} onChange={(e) => setPaySource(e.target.value)} title={language === 'en' ? 'Select Bill Payment Source' : 'Pilih Sumber Pembayaran Tagihan'}>
                        <option value="none">{language === 'en' ? 'No wallet deduction (log expense only)' : 'Tanpa potong dompet (catat pengeluaran saja)'}</option>
                        <option value="pot">{language === 'en' ? `Savings Pocket (balance: ${formatIDR(state.endSavings)})` : `Saku Tabungan (saldo: ${formatIDR(state.endSavings)})`}</option>
                        {state.wallets
                        .filter((w) => w.id !== END_SAVINGS_WALLET_ID)
                        .map((w) => (<option key={w.id} value={`wallet:${w.id}`}>
                              {w.name} ({language === 'en' ? 'balance:' : 'saldo:'} {formatIDR(w.balance)})
                            </option>))}
                      </CustomSelect>
                    </div>
                    <div className="ob-pay-actions">
                      <button type="button" className="btn btn-sm" disabled={payNominal <= 0 ||
                        payNominal > remaining ||
                        (paySource !== 'none' && payNominal > getSourceBalance(state, paySource))} onClick={() => confirmPayBill(bill)}>
                        {language === 'en' ? 'Confirm Payment' : 'Konfirmasi Bayar'}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={cancelPayBill}>
                        {language === 'en' ? 'Cancel' : 'Batal'}
                      </button>
                    </div>
                  </div>
                  <div className="ob-pay-chips">
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setPayNominal(remaining)}>
                      {language === 'en' ? `Pay in full (${formatIDR(remaining)})` : `Bayar lunas (${formatIDR(remaining)})`}
                    </button>
                    {remaining >= 50_000 && Math.round(remaining / 2) !== remaining && (<button type="button" className="btn btn-ghost btn-xs" onClick={() => setPayNominal(Math.round(remaining / 2))}>
                        {language === 'en' ? `Pay 50% (${formatIDR(Math.round(remaining / 2))})` : `Cicil 50% (${formatIDR(Math.round(remaining / 2))})`}
                      </button>)}
                  </div>
                  {payNominal > remaining && (<p className="small" style={{ color: 'var(--danger)', margin: 0 }}>
                      {language === 'en' ? `Amount exceeds remaining bill (${formatIDR(remaining)}).` : `Nominal melebihi sisa tagihan (${formatIDR(remaining)}).`}
                    </p>)}
                  {paySource !== 'none' && payNominal > getSourceBalance(state, paySource) && (<p className="small" style={{ color: 'var(--danger)', margin: 0 }}>
                      {language === 'en'
                            ? `${getSourceName(state, paySource)} balance is insufficient (available: ${formatIDR(getSourceBalance(state, paySource))}).`
                            : `Saldo ${getSourceName(state, paySource)} tidak mencukupi (tersedia: ${formatIDR(getSourceBalance(state, paySource))}).`}
                    </p>)}
                </div>)}
            </article>);
        })}
        {state.bills.length === 0 && (<p className="muted small">
            {language === 'en' ? 'No recurring bills yet. Record your electricity, internet, or rent below.' : 'Belum ada tagihan nih. Yuk catat listrik, wifi, atau kosan kamu di bawah.'}
          </p>)}
      </div>

      <form className="ob-form" onSubmit={addBill}>
        <div className="field">
          <label htmlFor="bill-name">{language === 'en' ? 'Bill name' : 'Nama tagihan'}</label>
          <input id="bill-name" className="input" value={billName} placeholder={language === 'en' ? 'Electricity, internet, rent…' : 'Listrik, internet, sewa…'} onChange={(e) => setBillName(e.target.value)}/>
        </div>
        <div className="field">
          <label htmlFor="bill-amount">{language === 'en' ? 'Amount (Rp)' : 'Nominal (Rp)'}</label>
          <MoneyInput id="bill-amount" value={billAmount} onValueChange={setBillAmount}/>
        </div>
        <MiniCalendar id="bill-due" value={billDay} onChange={setBillDay}/>
        <button type="submit" className="btn" disabled={!billName.trim() || billAmount <= 0}>
          {language === 'en' ? '+ Add bill' : '+ Tambah tagihan'}
        </button>
      </form>
    </section>

    {/* Kolom Kanan: Utang Berjalan */}
    <section className="card ob-column ob-col-debts">
      <header className="card-head">
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>{language === 'en' ? 'Active debts' : 'Utang berjalan'}</h3>
          <span className="muted small">
            {state.debts.length} {language === 'en' ? (state.debts.length === 1 ? 'debt' : 'debts') : 'utang'}
          </span>
        </div>
      </header>
      <div className="goal-list">
        {state.debts.map((debt) => {
            const remaining = Math.max(0, debt.total - debt.paid);
            const lunas = remaining <= 0;
            const days = daysUntilDue(debt.dueDay, now);
            const isPayingThisDebt = payingDebtId === debt.id;
            const debtSourceBal = getSourceBalance(state, debtPaySource);
            const isDebtInsufficient = debtPaySource !== 'none' && debtPayNominal > debtSourceBal;
            return (<article key={debt.id} className="ob-row">
              <div className="ob-main">
                <strong>{debt.name}</strong>
                <ProgressBar value={debt.paid} max={debt.total}/>
                <span className="muted small">
                  {language === 'en'
                    ? `Paid ${formatIDR(debt.paid)} of ${formatIDR(debt.total)} · left ${formatIDR(remaining)} · installment ${formatIDR(debt.installment)} every ${debt.dueDay}th`
                    : `Terbayar ${formatIDR(debt.paid)} dari ${formatIDR(debt.total)} · sisa ${formatIDR(remaining)} · angsuran ${formatIDR(debt.installment)} tiap tgl ${debt.dueDay}`}
                </span>
              </div>
              <span className={`ob-badge ${lunas ? 'ob-badge-ok' : days <= 3 ? 'ob-badge-due' : ''}`}>
                {lunas ? (language === 'en' ? 'Paid off' : 'Lunas') : dueLabel(days, language)}
              </span>
              <div className="ob-actions">
                <button type="button" className="btn btn-sm" disabled={lunas} onClick={() => (isPayingThisDebt ? cancelPayDebt() : openPayDebt(debt))}>
                  {isPayingThisDebt ? (language === 'en' ? 'Cancel' : 'Batal') : (language === 'en' ? 'Pay installment' : 'Bayar angsuran')}
                </button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => removeDebt(debt.id)}>
                  {language === 'en' ? 'Delete' : 'Hapus'}
                </button>
              </div>

              {isPayingThisDebt && (<div className="ob-pay-drawer">
                  <div className="ob-pay-info">
                    <span className="small">
                      {language === 'en' ? 'Remaining debt:' : 'Sisa utang:'} <strong>{formatIDR(remaining)}</strong> · {language === 'en' ? 'Installment:' : 'Angsuran:'} <strong>{formatIDR(debt.installment)}</strong>
                    </span>
                    <span className="muted small">
                      {language === 'en' ? 'Select wallet and enter amount to pay' : 'Pilih dompet dan masukin nominal yang mau dibayar'}
                    </span>
                  </div>

                  <div className="ob-pay-input-row">
                    <div className="field ob-pay-field">
                      <label htmlFor={`debt-amount-${debt.id}`}>{language === 'en' ? 'Payment amount (Rp)' : 'Nominal bayar (Rp)'}</label>
                      <MoneyInput id={`debt-amount-${debt.id}`} value={debtPayNominal} onValueChange={setDebtPayNominal} placeholder={language === 'en' ? 'Enter payment amount…' : 'Masukkan nominal bayar…'} autoFocus/>
                    </div>
                    <div className="field ob-pay-field">
                      <label htmlFor={`debt-source-${debt.id}`}>{language === 'en' ? 'Payment source' : 'Sumber pembayaran'}</label>
                      <CustomSelect id={`debt-source-${debt.id}`} className="input" value={debtPaySource} onChange={(e) => setDebtPaySource(e.target.value)} title={language === 'en' ? 'Select Installment Payment Source' : 'Pilih Sumber Pembayaran Angsuran'}>
                        <option value="none">{language === 'en' ? 'No wallet deduction (log expense only)' : 'Tanpa potong dompet (catat pengeluaran saja)'}</option>
                        <option value="pot">{language === 'en' ? `Savings Pocket (balance: ${formatIDR(state.endSavings)})` : `Saku Tabungan (saldo: ${formatIDR(state.endSavings)})`}</option>
                        {state.wallets
                        .filter((w) => w.id !== END_SAVINGS_WALLET_ID)
                        .map((w) => (<option key={w.id} value={`wallet:${w.id}`}>
                              {w.name} ({language === 'en' ? 'balance:' : 'saldo:'} {formatIDR(w.balance)})
                            </option>))}
                      </CustomSelect>
                    </div>
                    <div className="ob-pay-actions">
                      <button type="button" className="btn btn-sm" disabled={debtPayNominal <= 0 || debtPayNominal > remaining || isDebtInsufficient} onClick={() => confirmPayDebt(debt)}>
                        {language === 'en' ? 'Confirm Payment' : 'Konfirmasi Bayar'}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={cancelPayDebt}>
                        {language === 'en' ? 'Cancel' : 'Batal'}
                      </button>
                    </div>
                  </div>

                  <div className="ob-pay-chips">
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setDebtPayNominal(Math.min(debt.installment, remaining))}>
                      {language === 'en' ? `Installment amount (${formatIDR(Math.min(debt.installment, remaining))})` : `Sesuai angsuran (${formatIDR(Math.min(debt.installment, remaining))})`}
                    </button>
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setDebtPayNominal(remaining)}>
                      {language === 'en' ? `Pay in full (${formatIDR(remaining)})` : `Bayar lunas (${formatIDR(remaining)})`}
                    </button>
                  </div>

                  {debtPayNominal > remaining && (<p className="small" style={{ color: 'var(--danger)', margin: 0 }}>
                      {language === 'en' ? `Amount exceeds remaining debt (${formatIDR(remaining)}).` : `Nominal melebihi sisa utang (${formatIDR(remaining)}).`}
                    </p>)}

                  {isDebtInsufficient && (<p className="small" style={{ color: 'var(--danger)', margin: 0 }}>
                      {language === 'en'
                            ? `${getSourceName(state, debtPaySource)} balance is insufficient (available: ${formatIDR(debtSourceBal)}).`
                            : `Saldo ${getSourceName(state, debtPaySource)} tidak mencukupi (tersedia: ${formatIDR(debtSourceBal)}).`}
                    </p>)}
                </div>)}
            </article>);
        })}
        {state.debts.length === 0 && (<p className="muted small">
            {language === 'en' ? 'No debt recorded. Track your installments or loans below to stay ahead.' : 'Belum ada catatan utang. Catat cicilan, pinjaman, atau paylater kamu di bawah biar tenang.'}
          </p>)}
      </div>

      <form className="ob-form" onSubmit={addDebt}>
        <div className="field">
          <label htmlFor="debt-name">{language === 'en' ? 'Debt name' : 'Nama utang'}</label>
          <input id="debt-name" className="input" value={debtName} placeholder={language === 'en' ? 'Motorcycle, loan, paylater…' : 'Motor, pinjaman, paylater…'} onChange={(e) => setDebtName(e.target.value)}/>
        </div>
        <div className="field">
          <label htmlFor="debt-total">{language === 'en' ? 'Total debt (Rp)' : 'Total utang (Rp)'}</label>
          <MoneyInput id="debt-total" value={debtTotal} onValueChange={setDebtTotal}/>
        </div>
        <div className="field">
          <label htmlFor="debt-installment">{language === 'en' ? 'Monthly installment (Rp)' : 'Angsuran / bulan (Rp)'}</label>
          <MoneyInput id="debt-installment" value={debtInstallment} onValueChange={setDebtInstallment}/>
        </div>
        <MiniCalendar id="debt-due" value={debtDay} onChange={setDebtDay}/>
        <button type="submit" className="btn" disabled={!debtName.trim() || debtTotal <= 0 || debtInstallment <= 0}>
          {language === 'en' ? '+ Add debt' : '+ Tambah utang'}
        </button>
      </form>
    </section>
  </div>
    </div>);
}
