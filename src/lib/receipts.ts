import { uid } from './id'

const DB_NAME = 'kalkulator-duitmu-bukti'
const STORE = 'bukti'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB gagal dibuka'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = run(tx.objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB gagal'))
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
    tx.onabort = () => db.close()
  })
}

// kompres ke JPEG sisi terpanjang maksimal 1024px supaya hemat penyimpanan
export async function compressImage(file: Blob, maxSize = 1024): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  return blob ?? file
}

export async function saveReceipt(file: Blob): Promise<string> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB tidak tersedia')
  let blob = file
  try {
    blob = await compressImage(file)
  } catch {
    // gambar tidak bisa dikodekan ulang: simpan file apa adanya
  }
  const id = uid('rcp')
  await withStore('readwrite', (store) => store.put(blob, id))
  return id
}

export async function getReceipt(id: string): Promise<Blob | null> {
  if (typeof indexedDB === 'undefined') return null
  try {
    const blob = await withStore<Blob | undefined>('readonly', (store) => store.get(id))
    return blob ?? null
  } catch {
    return null
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    await withStore('readwrite', (store) => store.delete(id))
  } catch {
    // gagal hapus: blob yatim tidak mengganggu fungsionalitas
  }
}
