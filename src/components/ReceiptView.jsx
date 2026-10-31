import { useEffect, useState } from 'react';
import { getReceipt } from '../lib/receipts';
import { useI18n } from '../lib/i18n';
import { lockBodyScroll } from '../lib/scrollLock';
export function ReceiptView({ id }) {
    const { language } = useI18n();
    const isEn = language === 'en';
    const [url, setUrl] = useState(null);
    const [missing, setMissing] = useState(false);
    useEffect(() => {
        return () => {
            if (url)
                URL.revokeObjectURL(url);
        };
    }, [url]);
    useEffect(() => {
        if (!url)
            return;
        return lockBodyScroll();
    }, [url]);
    const show = async () => {
        const blob = await getReceipt(id);
        if (!blob) {
            setMissing(true);
            return;
        }
        setUrl(URL.createObjectURL(blob));
    };
    const close = () => setUrl(null);
    if (missing) {
        return <span className="muted small">{isEn ? 'Receipt missing' : 'Bukti hilang'}</span>;
    }
    return (<>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void show()}>
        {isEn ? 'Receipt' : 'Bukti'}
      </button>
      {url && (<div className="overlay receipt-overlay" role="dialog" aria-modal="true" onClick={close}>
          <img className="receipt-img" src={url} alt={isEn ? 'Transaction receipt' : 'Bukti transaksi'} onClick={(e) => e.stopPropagation()}/>
          <button type="button" className="btn receipt-close" onClick={close}>
            {isEn ? 'Close' : 'Tutup'}
          </button>
        </div>)}
    </>);
}
