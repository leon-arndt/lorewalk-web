// Journal album photos live in IndexedDB, not localStorage: images are large and
// would blow localStorage's ~5MB quota after a handful of days. Photos are stored
// as compressed JPEG data URLs keyed by local date (YYYY-MM-DD).

const DB_NAME = 'lorewalk_journal'
const STORE = 'photos'
const VERSION = 1

export interface JournalPhoto {
  id: string
  date: string        // YYYY-MM-DD (local)
  dataUrl: string
  createdAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addJournalPhoto(date: string, dataUrl: string): Promise<JournalPhoto> {
  const db = await openDb()
  const photo: JournalPhoto = {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date, dataUrl, createdAt: new Date().toISOString(),
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add(photo)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return photo
}

export async function getJournalPhotos(date: string): Promise<JournalPhoto[]> {
  const db = await openDb()
  const photos = await new Promise<JournalPhoto[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).index('date').getAll(IDBKeyRange.only(date))
    req.onsuccess = () => resolve(req.result as JournalPhoto[])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

// Set of dates that have at least one photo — drives the calendar's photo dots.
export async function getJournalPhotoDates(): Promise<Set<string>> {
  const db = await openDb()
  const dates = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as JournalPhoto[]).map((p) => p.date))
    req.onerror = () => reject(req.error)
  })
  db.close()
  return new Set(dates)
}

export async function deleteJournalPhoto(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

// Downscale + JPEG-compress a picked file to a data URL small enough to keep many.
export async function fileToCompressedDataUrl(file: File, maxDim = 1000, quality = 0.72): Promise<string> {
  const img = await loadImage(file)
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d unavailable')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}
