import type { StorageClient, StorageConfig } from './storage-client'
import { createStorageClient } from './storage-client'
import { createR2StorageClient, type R2Bucket } from './r2-storage-client'

// Get storage client - use R2 bucket if provided, otherwise fallback to S3
export function getStorage(r2Bucket?: R2Bucket): StorageClient {
  // If R2 bucket is provided, use it (Cloudflare runtime)
  if (r2Bucket) {
    return createR2StorageClient(r2Bucket)
  }

  // Fallback to S3 client for local development or Node.js runtime
  const config: StorageConfig = {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'auto',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    bucket: process.env.S3_BUCKET || '',
  }

  return createStorageClient(config)
}

// Re-export original exports
export { createStorageClient } from './storage-client'
export type { StorageClient, StorageConfig, StorageResult } from './storage-client'
export { createInMemoryStorage } from './in-memory-storage'
export type { InMemoryStorageClient } from './in-memory-storage'
export { createR2StorageClient, type R2Bucket } from './r2-storage-client'
export { getLocalStorage } from './local-storage'
export type { LocalStorageClient } from './local-storage'
