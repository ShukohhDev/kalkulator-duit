import { useEffect, useState } from 'react'
import { getReceipt } from '../lib/receipts'

interface Props {
  id: string
}

export function ReceiptView({ id }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  const show = async () => {
    const blob = await getReceipt(id)
    if (!blob) {
      setMissing(true)
      return
    }
    setUrl(URL.createObjectURL(blob))
  }

  const close = () => setUrl(null)

  if (missing) {
    return <span className="muted small">Bukti hilang</span>
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void show()}>
        Bukti
      </button>
      {url && (
        <div className="overlay receipt-overlay" role="dialog" aria-modal="true" onClick={close}>
          <img className="receipt-img" src={url} alt="Bukti transaksi" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="btn receipt-close" onClick={close}>
            Tutup
          </button>
        </div>
      )}
    </>
  )
}
