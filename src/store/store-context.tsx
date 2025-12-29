'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createAppStore, AppStore, AppState } from './app-store'
import { createInMemoryStorage, InMemoryStorageClient } from '@/lib/storage'
import { getDeviceId } from '@/lib/device-id'
import type { Collection, Environment, ApiRequest, HistoryEntry, ApiResponse } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// Debounce helper for sync function
function createDebouncedSync(ms: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (fn: () => void) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(fn, ms)
  }
}

interface StoreContextValue {
  state: AppState
  store: AppStore
  storage: InMemoryStorageClient

  // Collection actions
  createCollection: (name: string, description?: string) => Collection
  updateCollection: (id: string, updates: Partial<Collection>) => void
  deleteCollection: (id: string) => void
  setActiveCollection: (id: string | null) => void

  // Request actions
  createRequest: (collectionId: string, name: string, method?: string) => ApiRequest
  updateRequest: (collectionId: string, requestId: string, updates: Partial<ApiRequest>) => void
  deleteRequest: (collectionId: string, requestId: string) => void
  setActiveRequest: (request: ApiRequest | null) => void
  updateActiveRequest: (updates: Partial<ApiRequest>) => void

  // Environment actions
  createEnvironment: (name: string) => Environment
  updateEnvironment: (id: string, updates: Partial<Environment>) => void
  deleteEnvironment: (id: string) => void
  setActiveEnvironment: (id: string | null) => void

  // Response actions
  setResponse: (response: ApiResponse, requestId?: string) => void
  getResponseForRequest: (requestId: string) => ApiResponse | null
  clearResponse: () => void

  // History actions
  addToHistory: (entry: HistoryEntry) => void
  clearHistory: () => void

  // Loading
  setLoading: (loading: boolean) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

interface StoreProviderProps {
  children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const [store] = useState(() => createAppStore())
  const [storage] = useState(() => createInMemoryStorage())
  const [state, setState] = useState<AppState>(() => store.getState())
  const isInitialized = useRef(false)
  const isSyncing = useRef(false)
  const debouncedSync = useRef(createDebouncedSync(1000))

  // Sync to API (always - using device ID for anonymous users)
  const syncToApi = useCallback(async (collections: Collection[], environments: Environment[]) => {
    if (isSyncing.current) return

    const deviceId = getDeviceId()
    if (!deviceId) return

    isSyncing.current = true

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-device-id': deviceId,
      }

      await Promise.all([
        fetch('/api/collections', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ collections }),
        }),
        fetch('/api/environments', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ environments }),
        }),
      ])
    } catch (error) {
      console.error('Failed to sync to API:', error)
    } finally {
      isSyncing.current = false
    }
  }, [])

  // Load data on mount - ALWAYS from API using device ID or Clerk auth
  useEffect(() => {
    if (isInitialized.current) return

    const loadData = async () => {
      isInitialized.current = true

      const deviceId = getDeviceId()
      if (!deviceId) {
        setState(store.getState())
        return
      }

      // Always load from API (S3/R2)
      try {
        const headers: Record<string, string> = {
          'x-device-id': deviceId,
        }

        const [collectionsRes, environmentsRes] = await Promise.all([
          fetch('/api/collections', { headers }),
          fetch('/api/environments', { headers }),
        ])

        if (collectionsRes.ok) {
          const data = await collectionsRes.json() as { collections: Collection[] }
          if (data.collections && data.collections.length > 0) {
            store.setCollections(data.collections)
          }
        }

        if (environmentsRes.ok) {
          const data = await environmentsRes.json() as { environments: Environment[] }
          if (data.environments && data.environments.length > 0) {
            store.setEnvironments(data.environments)
          }
        }

        // Force state update since subscription might not be set up yet
        setState(store.getState())
      } catch (error) {
        console.error('Failed to load from API:', error)
        setState(store.getState())
      }
    }

    loadData()
  }, [store])

  // Subscribe to store changes and sync to S3/R2
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const newState = store.getState()
      setState(newState)

      // Always sync to API (S3/R2) - debounced
      debouncedSync.current(() => {
        syncToApi(newState.collections, newState.environments)
      })
    })
    return unsubscribe
  }, [store, syncToApi])

  const value = useMemo<StoreContextValue>(() => {
    const createCollection = (name: string, description?: string): Collection => {
      const now = new Date().toISOString()
      const collection: Collection = {
        id: uuidv4(),
        name,
        description,
        requests: [],
        folders: [],
        variables: [],
        createdAt: now,
        updatedAt: now,
      }
      store.addCollection(collection)
      return collection
    }

    const createRequest = (
      collectionId: string,
      name: string,
      method: string = 'GET'
    ): ApiRequest => {
      const now = new Date().toISOString()
      const request: ApiRequest = {
        id: uuidv4(),
        name,
        method: method as ApiRequest['method'],
        url: '',
        headers: [],
        params: [],
        createdAt: now,
        updatedAt: now,
      }
      store.addRequestToCollection(collectionId, request)
      return request
    }

    const createEnvironment = (name: string): Environment => {
      const now = new Date().toISOString()
      const environment: Environment = {
        id: uuidv4(),
        name,
        variables: [],
        createdAt: now,
        updatedAt: now,
      }
      store.addEnvironment(environment)
      return environment
    }

    return {
      state,
      store,
      storage,

      // Collection actions
      createCollection,
      updateCollection: store.updateCollection.bind(store),
      deleteCollection: store.deleteCollection.bind(store),
      setActiveCollection: store.setActiveCollection.bind(store),

      // Request actions
      createRequest,
      updateRequest: store.updateRequestInCollection.bind(store),
      deleteRequest: store.deleteRequestFromCollection.bind(store),
      setActiveRequest: store.setActiveRequest.bind(store),
      updateActiveRequest: store.updateActiveRequest.bind(store),

      // Environment actions
      createEnvironment,
      updateEnvironment: store.updateEnvironment.bind(store),
      deleteEnvironment: store.deleteEnvironment.bind(store),
      setActiveEnvironment: store.setActiveEnvironment.bind(store),

      // Response actions
      setResponse: store.setResponse.bind(store),
      getResponseForRequest: store.getResponseForRequest.bind(store),
      clearResponse: store.clearResponse.bind(store),

      // History actions
      addToHistory: store.addHistoryEntry.bind(store),
      clearHistory: store.clearHistory.bind(store),

      // Loading
      setLoading: store.setLoading.bind(store),
    }
  }, [state, store, storage])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

// Convenience hooks
export function useCollections() {
  const { state, createCollection, updateCollection, deleteCollection, setActiveCollection } = useStore()
  return {
    collections: state.collections,
    activeCollectionId: state.activeCollectionId,
    activeCollection: state.collections.find((c) => c.id === state.activeCollectionId) ?? null,
    createCollection,
    updateCollection,
    deleteCollection,
    setActiveCollection,
  }
}

export function useEnvironments() {
  const { state, createEnvironment, updateEnvironment, deleteEnvironment, setActiveEnvironment } = useStore()
  return {
    environments: state.environments,
    activeEnvironmentId: state.activeEnvironmentId,
    activeEnvironment: state.environments.find((e) => e.id === state.activeEnvironmentId) ?? null,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
  }
}

export function useActiveRequest() {
  const { state, setActiveRequest, updateActiveRequest } = useStore()
  return {
    activeRequest: state.activeRequest,
    setActiveRequest,
    updateActiveRequest,
  }
}

export function useResponse() {
  const { state, setResponse, clearResponse } = useStore()
  return {
    response: state.response,
    setResponse,
    clearResponse,
  }
}

export function useHistory() {
  const { state, addToHistory, clearHistory } = useStore()
  return {
    history: state.history,
    addToHistory,
    clearHistory,
  }
}

export function useLoading() {
  const { state, setLoading } = useStore()
  return {
    isLoading: state.isLoading,
    setLoading,
  }
}
