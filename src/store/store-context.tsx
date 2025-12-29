'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createAppStore, AppStore, AppState } from './app-store'
import { createInMemoryStorage, InMemoryStorageClient, getLocalStorage } from '@/lib/storage'
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
  setResponse: (response: ApiResponse) => void
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

  // Sync to API
  const syncToApi = useCallback(async (collections: Collection[], environments: Environment[]) => {
    if (!isSignedIn || isSyncing.current) return
    isSyncing.current = true

    try {
      await Promise.all([
        fetch('/api/collections', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collections }),
        }),
        fetch('/api/environments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ environments }),
        }),
      ])
    } catch (error) {
      console.error('Failed to sync to API:', error)
    } finally {
      isSyncing.current = false
    }
  }, [isSignedIn])

  // Load data on mount - from API if signed in, otherwise localStorage
  useEffect(() => {
    if (!isLoaded || isInitialized.current) return

    const loadData = async () => {
      isInitialized.current = true

      if (isSignedIn) {
        // Load from API
        try {
          const [collectionsRes, environmentsRes] = await Promise.all([
            fetch('/api/collections'),
            fetch('/api/environments'),
          ])

          if (collectionsRes.ok) {
            const { collections } = await collectionsRes.json()
            if (collections && collections.length > 0) {
              store.setCollections(collections)
            }
          }

          if (environmentsRes.ok) {
            const { environments } = await environmentsRes.json()
            if (environments && environments.length > 0) {
              store.setEnvironments(environments)
            }
          }

          // Load active IDs from localStorage (these are UI state, not persisted to S3)
          const localStorage = getLocalStorage()
          const activeCollectionId = localStorage.loadActiveCollectionId()
          const activeEnvironmentId = localStorage.loadActiveEnvironmentId()
          const history = localStorage.loadHistory()

          if (activeCollectionId) store.setActiveCollection(activeCollectionId)
          if (activeEnvironmentId) store.setActiveEnvironment(activeEnvironmentId)
          if (history.length > 0) store.setHistory(history)

          // Force state update since subscription might not be set up yet
          setState(store.getState())
        } catch (error) {
          console.error('Failed to load from API:', error)
          // Fallback to localStorage
          const localStorage = getLocalStorage()
          const collections = localStorage.loadCollections()
          const environments = localStorage.loadEnvironments()
          if (collections.length > 0) store.setCollections(collections)
          if (environments.length > 0) store.setEnvironments(environments)
          setState(store.getState())
        }
      } else {
        // Not signed in - load from localStorage
        const localStorage = getLocalStorage()
        const collections = localStorage.loadCollections()
        const environments = localStorage.loadEnvironments()
        const history = localStorage.loadHistory()
        const activeCollectionId = localStorage.loadActiveCollectionId()
        const activeEnvironmentId = localStorage.loadActiveEnvironmentId()

        if (collections.length > 0) store.setCollections(collections)
        if (environments.length > 0) store.setEnvironments(environments)
        if (history.length > 0) store.setHistory(history)
        if (activeCollectionId) store.setActiveCollection(activeCollectionId)
        if (activeEnvironmentId) store.setActiveEnvironment(activeEnvironmentId)

        // Force state update since subscription might not be set up yet
        setState(store.getState())
      }
    }

    loadData()
  }, [isLoaded, isSignedIn, store])

  // Subscribe to store changes and persist
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const newState = store.getState()
      setState(newState)

      // Always persist to localStorage (for UI state and offline fallback)
      const localStorage = getLocalStorage()
      localStorage.saveCollections(newState.collections)
      localStorage.saveEnvironments(newState.environments)
      localStorage.saveHistory(newState.history)
      localStorage.saveActiveCollectionId(newState.activeCollectionId)
      localStorage.saveActiveEnvironmentId(newState.activeEnvironmentId)

      // If signed in, also sync to API (debounced)
      if (isSignedIn) {
        debouncedSync.current(() => {
          syncToApi(newState.collections, newState.environments)
        })
      }
    })
    return unsubscribe
  }, [store, isSignedIn, syncToApi])

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
