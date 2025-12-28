import type { Collection, Environment, ApiRequest, HistoryEntry, ApiResponse } from '@/types'

export interface AppState {
  collections: Collection[]
  environments: Environment[]
  activeCollectionId: string | null
  activeEnvironmentId: string | null
  activeRequest: ApiRequest | null
  response: ApiResponse | null
  history: HistoryEntry[]
  isLoading: boolean
}

export interface AppStore {
  getState(): AppState
  subscribe(listener: () => void): () => void

  // Collections
  addCollection(collection: Collection): void
  updateCollection(id: string, updates: Partial<Collection>): void
  deleteCollection(id: string): void
  setActiveCollection(id: string | null): void

  // Requests within collections
  addRequestToCollection(collectionId: string, request: ApiRequest): void
  updateRequestInCollection(collectionId: string, requestId: string, updates: Partial<ApiRequest>): void
  deleteRequestFromCollection(collectionId: string, requestId: string): void

  // Environments
  addEnvironment(environment: Environment): void
  updateEnvironment(id: string, updates: Partial<Environment>): void
  deleteEnvironment(id: string): void
  setActiveEnvironment(id: string | null): void

  // Active request
  setActiveRequest(request: ApiRequest | null): void
  updateActiveRequest(updates: Partial<ApiRequest>): void
  clearActiveRequest(): void

  // Response
  setResponse(response: ApiResponse): void
  clearResponse(): void

  // History
  addHistoryEntry(entry: HistoryEntry): void
  clearHistory(): void

  // Loading
  setLoading(loading: boolean): void

  // Bulk operations
  setCollections(collections: Collection[]): void
  setEnvironments(environments: Environment[]): void
  setHistory(history: HistoryEntry[]): void
}

const MAX_HISTORY_ENTRIES = 100

class AppStoreImpl implements AppStore {
  private state: AppState
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.state = {
      collections: [],
      environments: [],
      activeCollectionId: null,
      activeEnvironmentId: null,
      activeRequest: null,
      response: null,
      history: [],
      isLoading: false,
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  private setState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates }
    this.notify()
  }

  getState(): AppState {
    return this.state
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Collections
  addCollection(collection: Collection): void {
    this.setState({
      collections: [...this.state.collections, collection],
    })
  }

  updateCollection(id: string, updates: Partial<Collection>): void {
    this.setState({
      collections: this.state.collections.map((col) =>
        col.id === id ? { ...col, ...updates, updatedAt: new Date().toISOString() } : col
      ),
    })
  }

  deleteCollection(id: string): void {
    this.setState({
      collections: this.state.collections.filter((col) => col.id !== id),
      activeCollectionId: this.state.activeCollectionId === id ? null : this.state.activeCollectionId,
    })
  }

  setActiveCollection(id: string | null): void {
    this.setState({ activeCollectionId: id })
  }

  // Requests within collections
  addRequestToCollection(collectionId: string, request: ApiRequest): void {
    this.setState({
      collections: this.state.collections.map((col) =>
        col.id === collectionId
          ? { ...col, requests: [...col.requests, request], updatedAt: new Date().toISOString() }
          : col
      ),
    })
  }

  updateRequestInCollection(collectionId: string, requestId: string, updates: Partial<ApiRequest>): void {
    this.setState({
      collections: this.state.collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              requests: col.requests.map((req) =>
                req.id === requestId ? { ...req, ...updates, updatedAt: new Date().toISOString() } : req
              ),
              updatedAt: new Date().toISOString(),
            }
          : col
      ),
    })
  }

  deleteRequestFromCollection(collectionId: string, requestId: string): void {
    this.setState({
      collections: this.state.collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              requests: col.requests.filter((req) => req.id !== requestId),
              updatedAt: new Date().toISOString(),
            }
          : col
      ),
    })
  }

  // Environments
  addEnvironment(environment: Environment): void {
    this.setState({
      environments: [...this.state.environments, environment],
    })
  }

  updateEnvironment(id: string, updates: Partial<Environment>): void {
    this.setState({
      environments: this.state.environments.map((env) =>
        env.id === id ? { ...env, ...updates, updatedAt: new Date().toISOString() } : env
      ),
    })
  }

  deleteEnvironment(id: string): void {
    this.setState({
      environments: this.state.environments.filter((env) => env.id !== id),
      activeEnvironmentId: this.state.activeEnvironmentId === id ? null : this.state.activeEnvironmentId,
    })
  }

  setActiveEnvironment(id: string | null): void {
    this.setState({ activeEnvironmentId: id })
  }

  // Active request
  setActiveRequest(request: ApiRequest | null): void {
    this.setState({ activeRequest: request })
  }

  updateActiveRequest(updates: Partial<ApiRequest>): void {
    if (this.state.activeRequest) {
      this.setState({
        activeRequest: { ...this.state.activeRequest, ...updates, updatedAt: new Date().toISOString() },
      })
    }
  }

  clearActiveRequest(): void {
    this.setState({ activeRequest: null })
  }

  // Response
  setResponse(response: ApiResponse): void {
    this.setState({ response })
  }

  clearResponse(): void {
    this.setState({ response: null })
  }

  // History
  addHistoryEntry(entry: HistoryEntry): void {
    const newHistory = [entry, ...this.state.history].slice(0, MAX_HISTORY_ENTRIES)
    this.setState({ history: newHistory })
  }

  clearHistory(): void {
    this.setState({ history: [] })
  }

  // Loading
  setLoading(loading: boolean): void {
    this.setState({ isLoading: loading })
  }

  // Bulk operations
  setCollections(collections: Collection[]): void {
    this.setState({ collections })
  }

  setEnvironments(environments: Environment[]): void {
    this.setState({ environments })
  }

  setHistory(history: HistoryEntry[]): void {
    this.setState({ history: history.slice(0, MAX_HISTORY_ENTRIES) })
  }
}

export function createAppStore(): AppStore {
  return new AppStoreImpl()
}

// Singleton store for the app
let globalStore: AppStore | null = null

export function getAppStore(): AppStore {
  if (!globalStore) {
    globalStore = createAppStore()
  }
  return globalStore
}
