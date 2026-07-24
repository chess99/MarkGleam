import { openDB } from 'idb'
import type { AssetRecord } from '../types'

const DB_NAME = 'md2img-assets'
const STORE_NAME = 'assets'

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
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type || (kind === 'font' ? 'font/woff2' : 'application/octet-stream'),
    kind,
    blob: file,
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

export const loadAssetUrl = async (id: string) => {
  const asset = await getAsset(id)
  return asset ? URL.createObjectURL(asset.blob) : undefined
}
