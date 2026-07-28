import { openDB } from 'idb'
import type { AssetRecord } from '../types'

const DB_NAME = 'md2img-assets'
const STORE_NAME = 'assets'

const createAssetId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10).join(''),
  ].join('-')
}

const getDb = () =>
  openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })

export const saveAsset = async (
  file: File,
  kind: AssetRecord['kind'],
): Promise<AssetRecord> => {
  const record: AssetRecord = {
    id: createAssetId(),
    name: file.name,
    mime: file.type || (kind === 'font' ? 'font/woff2' : 'application/octet-stream'),
    kind,
    // WebKit cannot reliably persist Blob/File values in IndexedDB. An
    // ArrayBuffer remains portable and is restored to a Blob when consumed.
    blob: await file.arrayBuffer(),
    createdAt: Date.now(),
  }
  const db = await getDb()
  await db.put(STORE_NAME, record)
  return record
}

export const getAsset = async (id: string): Promise<AssetRecord | undefined> => {
  const db = await getDb()
  return db.get(STORE_NAME, id)
}

export const deleteAsset = async (id: string) => {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}

export const parseAssetUrl = (src?: string) => {
  if (!src?.startsWith('md2img-asset://')) return undefined
  return src.slice('md2img-asset://'.length)
}

export const assetToBlob = (asset: AssetRecord) =>
  asset.blob instanceof Blob
    ? asset.blob
    : new Blob([asset.blob], { type: asset.mime })

export const loadAssetUrl = async (id: string) => {
  const asset = await getAsset(id)
  return asset ? URL.createObjectURL(assetToBlob(asset)) : undefined
}
