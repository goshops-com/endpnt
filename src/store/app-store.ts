import type { Collection, Environment, ApiRequest, HistoryEntry, ApiResponse, Folder } from '@/types'

export interface AppState {
  collections: Collection[]
  environments: Environment[]
  activeCollectionId: string | null
  activeEnvironmentId: string | null
  activeRequest: ApiRequest | null
  response: ApiResponse | null
  responses: Record<string, ApiResponse> // Responses stored per request ID
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

  // Folders within collections
  addFolderToCollection(collectionId: string, folder: Folder, parentFolderId?: string): void
  updateFolderInCollection(collectionId: string, folderId: string, updates: Partial<Folder>): void
  deleteFolderFromCollection(collectionId: string, folderId: string): void
  addRequestToFolder(collectionId: string, folderId: string, request: ApiRequest): void
  deleteRequestFromFolder(collectionId: string, folderId: string, requestId: string): void
  moveRequestToFolder(collectionId: string, requestId: string, fromFolderId: string | null, toFolderId: string | null): void

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
  setResponse(response: ApiResponse, requestId?: string): void
  getResponseForRequest(requestId: string): ApiResponse | null
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
      responses: {},
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

  // Folders within collections
  addFolderToCollection(collectionId: string, folder: Folder, parentFolderId?: string): void {
    const addFolderRecursive = (folders: Folder[], targetId: string, newFolder: Folder): Folder[] => {
      return folders.map((f) => {
        if (f.id === targetId) {
          return { ...f, folders: [...f.folders, newFolder] }
        }
        if (f.folders.length > 0) {
          return { ...f, folders: addFolderRecursive(f.folders, targetId, newFolder) }
        }
        return f
      })
    }

    this.setState({
      collections: this.state.collections.map((col) => {
        if (col.id !== collectionId) return col
        if (parentFolderId) {
          return {
            ...col,
            folders: addFolderRecursive(col.folders, parentFolderId, folder),
            updatedAt: new Date().toISOString(),
          }
        }
        return {
          ...col,
          folders: [...col.folders, folder],
          updatedAt: new Date().toISOString(),
        }
      }),
    })
  }

  updateFolderInCollection(collectionId: string, folderId: string, updates: Partial<Folder>): void {
    const updateFolderRecursive = (folders: Folder[]): Folder[] => {
      return folders.map((f) => {
        if (f.id === folderId) {
          return { ...f, ...updates }
        }
        if (f.folders.length > 0) {
          return { ...f, folders: updateFolderRecursive(f.folders) }
        }
        return f
      })
    }

    this.setState({
      collections: this.state.collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              folders: updateFolderRecursive(col.folders),
              updatedAt: new Date().toISOString(),
            }
          : col
      ),
    })
  }

  deleteFolderFromCollection(collectionId: string, folderId: string): void {
    const deleteFolderRecursive = (folders: Folder[]): Folder[] => {
      return folders
        .filter((f) => f.id !== folderId)
        .map((f) => ({
          ...f,
          folders: deleteFolderRecursive(f.folders),
        }))
    }

    this.setState({
      collections: this.state.collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              folders: deleteFolderRecursive(col.folders),
              updatedAt: new Date().toISOString(),
            }
          : col
      ),
    })
  }

  addRequestToFolder(collectionId: string, folderId: string, request: ApiRequest): void {
    const addRequestRecursive = (folders: Folder[]): Folder[] => {
      return folders.map((f) => {
        if (f.id === folderId) {
          return { ...f, requests: [...f.requests, request] }
        }
        if (f.folders.length > 0) {
          return { ...f, folders: addRequestRecursive(f.folders) }
        }
        return f
      })
    }

    this.setState({
      collections: this.state.collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              folders: addRequestRecursive(col.folders),
              updatedAt: new Date().toISOString(),
            }
          : col
      ),
    })
  }

  deleteRequestFromFolder(collectionId: string, folderId: string, requestId: string): void {
    const deleteRequestRecursive = (folders: Folder[]): Folder[] => {
      return folders.map((f) => {
        if (f.id === folderId) {
          return { ...f, requests: f.requests.filter((r) => r.id !== requestId) }
        }
        if (f.folders.length > 0) {
          return { ...f, folders: deleteRequestRecursive(f.folders) }
        }
        return f
      })
    }

    this.setState({
      collections: this.state.collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              folders: deleteRequestRecursive(col.folders),
              updatedAt: new Date().toISOString(),
            }
          : col
      ),
    })
  }

  moveRequestToFolder(collectionId: string, requestId: string, fromFolderId: string | null, toFolderId: string | null): void {
    let movedRequest: ApiRequest | null = null

    // Helper to find and remove request from folders
    const removeFromFolders = (folders: Folder[]): Folder[] => {
      return folders.map((f) => {
        if (fromFolderId && f.id === fromFolderId) {
          const req = f.requests.find((r) => r.id === requestId)
          if (req) movedRequest = req
          return { ...f, requests: f.requests.filter((r) => r.id !== requestId) }
        }
        if (f.folders.length > 0) {
          return { ...f, folders: removeFromFolders(f.folders) }
        }
        return f
      })
    }

    // Helper to add request to folders
    const addToFolders = (folders: Folder[], request: ApiRequest): Folder[] => {
      return folders.map((f) => {
        if (f.id === toFolderId) {
          return { ...f, requests: [...f.requests, request] }
        }
        if (f.folders.length > 0) {
          return { ...f, folders: addToFolders(f.folders, request) }
        }
        return f
      })
    }

    this.setState({
      collections: this.state.collections.map((col) => {
        if (col.id !== collectionId) return col

        let requests = col.requests
        let folders = col.folders

        // Remove from source
        if (fromFolderId === null) {
          const req = requests.find((r) => r.id === requestId)
          if (req) movedRequest = req
          requests = requests.filter((r) => r.id !== requestId)
        } else {
          folders = removeFromFolders(folders)
        }

        if (!movedRequest) return col

        // Add to destination
        if (toFolderId === null) {
          requests = [...requests, movedRequest]
        } else {
          folders = addToFolders(folders, movedRequest)
        }

        return { ...col, requests, folders, updatedAt: new Date().toISOString() }
      }),
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
    // When switching requests, load the stored response for that request
    const response = request ? this.state.responses[request.id] || null : null
    this.setState({ activeRequest: request, response })
  }

  updateActiveRequest(updates: Partial<ApiRequest>): void {
    if (this.state.activeRequest) {
      const updatedRequest = { ...this.state.activeRequest, ...updates, updatedAt: new Date().toISOString() }

      // Update the active request state
      this.setState({ activeRequest: updatedRequest })

      // Also sync the changes to the collection if we have an active collection
      if (this.state.activeCollectionId) {
        this.updateRequestInCollection(this.state.activeCollectionId, this.state.activeRequest.id, updates)
      }
    }
  }

  clearActiveRequest(): void {
    this.setState({ activeRequest: null })
  }

  // Response
  setResponse(response: ApiResponse, requestId?: string): void {
    // Use provided requestId or fall back to activeRequest.id
    const id = requestId || this.state.activeRequest?.id
    if (id) {
      // Store response for this specific request
      this.setState({
        response,
        responses: { ...this.state.responses, [id]: response },
      })
    } else {
      // Fallback: just set the current response
      this.setState({ response })
    }
  }

  getResponseForRequest(requestId: string): ApiResponse | null {
    return this.state.responses[requestId] || null
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
