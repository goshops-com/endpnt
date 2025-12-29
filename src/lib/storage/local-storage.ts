import type { Collection, Environment, HistoryEntry } from '@/types'

const STORAGE_KEYS = {
  COLLECTIONS: 'endpnt_collections',
  ENVIRONMENTS: 'endpnt_environments',
  HISTORY: 'endpnt_history',
  ACTIVE_COLLECTION_ID: 'endpnt_active_collection_id',
  ACTIVE_ENVIRONMENT_ID: 'endpnt_active_environment_id',
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__'
    window.localStorage.setItem(test, test)
    window.localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

export interface LocalStorageClient {
  // Collections
  saveCollections(collections: Collection[]): void
  loadCollections(): Collection[]

  // Environments
  saveEnvironments(environments: Environment[]): void
  loadEnvironments(): Environment[]

  // History
  saveHistory(history: HistoryEntry[]): void
  loadHistory(): HistoryEntry[]

  // Active IDs
  saveActiveCollectionId(id: string | null): void
  loadActiveCollectionId(): string | null
  saveActiveEnvironmentId(id: string | null): void
  loadActiveEnvironmentId(): string | null

  // Clear
  clear(): void
}

class LocalStorage implements LocalStorageClient {
  private available: boolean

  constructor() {
    this.available = typeof window !== 'undefined' && isLocalStorageAvailable()
  }

  isAvailable(): boolean {
    return this.available
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (!this.available) return defaultValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  }

  private setItem(key: string, value: unknown): void {
    if (!this.available) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }

  // Collections
  saveCollections(collections: Collection[]): void {
    this.setItem(STORAGE_KEYS.COLLECTIONS, collections)
  }

  loadCollections(): Collection[] {
    return this.getItem<Collection[]>(STORAGE_KEYS.COLLECTIONS, [])
  }

  // Environments
  saveEnvironments(environments: Environment[]): void {
    this.setItem(STORAGE_KEYS.ENVIRONMENTS, environments)
  }

  loadEnvironments(): Environment[] {
    return this.getItem<Environment[]>(STORAGE_KEYS.ENVIRONMENTS, [])
  }

  // History
  saveHistory(history: HistoryEntry[]): void {
    this.setItem(STORAGE_KEYS.HISTORY, history)
  }

  loadHistory(): HistoryEntry[] {
    return this.getItem<HistoryEntry[]>(STORAGE_KEYS.HISTORY, [])
  }

  // Active IDs
  saveActiveCollectionId(id: string | null): void {
    this.setItem(STORAGE_KEYS.ACTIVE_COLLECTION_ID, id)
  }

  loadActiveCollectionId(): string | null {
    return this.getItem<string | null>(STORAGE_KEYS.ACTIVE_COLLECTION_ID, null)
  }

  saveActiveEnvironmentId(id: string | null): void {
    this.setItem(STORAGE_KEYS.ACTIVE_ENVIRONMENT_ID, id)
  }

  loadActiveEnvironmentId(): string | null {
    return this.getItem<string | null>(STORAGE_KEYS.ACTIVE_ENVIRONMENT_ID, null)
  }

  // Clear all data
  clear(): void {
    if (!this.available) return
    Object.values(STORAGE_KEYS).forEach(key => {
      window.localStorage.removeItem(key)
    })
  }
}

let instance: LocalStorageClient | null = null

export function getLocalStorage(): LocalStorageClient {
  // Always create a new instance on client side to ensure localStorage is available
  // This handles the case where the singleton might have been created during SSR
  if (typeof window !== 'undefined') {
    if (!instance || !(instance as LocalStorage).isAvailable()) {
      instance = new LocalStorage()
    }
  } else if (!instance) {
    instance = new LocalStorage()
  }
  return instance
}
