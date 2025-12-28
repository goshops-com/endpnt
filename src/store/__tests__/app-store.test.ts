import { describe, it, expect, beforeEach } from 'vitest'
import { createAppStore, AppStore } from '../app-store'
import type { Collection, Environment, ApiRequest, HistoryEntry } from '@/types'

describe('AppStore', () => {
  let store: AppStore

  beforeEach(() => {
    store = createAppStore()
  })

  describe('Collections', () => {
    const mockCollection: Collection = {
      id: 'col-123',
      name: 'Test Collection',
      description: 'A test collection',
      requests: [],
      folders: [],
      variables: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    it('should start with empty collections', () => {
      expect(store.getState().collections).toEqual([])
    })

    it('should add a collection', () => {
      store.addCollection(mockCollection)
      expect(store.getState().collections).toHaveLength(1)
      expect(store.getState().collections[0]).toEqual(mockCollection)
    })

    it('should update a collection', () => {
      store.addCollection(mockCollection)
      store.updateCollection('col-123', { name: 'Updated Name' })
      expect(store.getState().collections[0].name).toBe('Updated Name')
    })

    it('should delete a collection', () => {
      store.addCollection(mockCollection)
      store.deleteCollection('col-123')
      expect(store.getState().collections).toHaveLength(0)
    })

    it('should set active collection', () => {
      store.addCollection(mockCollection)
      store.setActiveCollection('col-123')
      expect(store.getState().activeCollectionId).toBe('col-123')
    })

    it('should add request to collection', () => {
      store.addCollection(mockCollection)
      const request: ApiRequest = {
        id: 'req-123',
        name: 'Test Request',
        method: 'GET',
        url: 'https://api.example.com',
        headers: [],
        params: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      store.addRequestToCollection('col-123', request)
      expect(store.getState().collections[0].requests).toHaveLength(1)
    })

    it('should update request in collection', () => {
      store.addCollection(mockCollection)
      const request: ApiRequest = {
        id: 'req-123',
        name: 'Test Request',
        method: 'GET',
        url: 'https://api.example.com',
        headers: [],
        params: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      store.addRequestToCollection('col-123', request)
      store.updateRequestInCollection('col-123', 'req-123', { name: 'Updated Request' })
      expect(store.getState().collections[0].requests[0].name).toBe('Updated Request')
    })

    it('should delete request from collection', () => {
      store.addCollection(mockCollection)
      const request: ApiRequest = {
        id: 'req-123',
        name: 'Test Request',
        method: 'GET',
        url: 'https://api.example.com',
        headers: [],
        params: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      store.addRequestToCollection('col-123', request)
      store.deleteRequestFromCollection('col-123', 'req-123')
      expect(store.getState().collections[0].requests).toHaveLength(0)
    })
  })

  describe('Environments', () => {
    const mockEnvironment: Environment = {
      id: 'env-123',
      name: 'Development',
      variables: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    it('should start with empty environments', () => {
      expect(store.getState().environments).toEqual([])
    })

    it('should add an environment', () => {
      store.addEnvironment(mockEnvironment)
      expect(store.getState().environments).toHaveLength(1)
    })

    it('should update an environment', () => {
      store.addEnvironment(mockEnvironment)
      store.updateEnvironment('env-123', { name: 'Production' })
      expect(store.getState().environments[0].name).toBe('Production')
    })

    it('should delete an environment', () => {
      store.addEnvironment(mockEnvironment)
      store.deleteEnvironment('env-123')
      expect(store.getState().environments).toHaveLength(0)
    })

    it('should set active environment', () => {
      store.addEnvironment(mockEnvironment)
      store.setActiveEnvironment('env-123')
      expect(store.getState().activeEnvironmentId).toBe('env-123')
    })
  })

  describe('Active Request', () => {
    const mockRequest: ApiRequest = {
      id: 'req-123',
      name: 'Test Request',
      method: 'GET',
      url: 'https://api.example.com',
      headers: [],
      params: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    it('should set active request', () => {
      store.setActiveRequest(mockRequest)
      expect(store.getState().activeRequest).toEqual(mockRequest)
    })

    it('should update active request', () => {
      store.setActiveRequest(mockRequest)
      store.updateActiveRequest({ url: 'https://api.new.com' })
      expect(store.getState().activeRequest?.url).toBe('https://api.new.com')
    })

    it('should clear active request', () => {
      store.setActiveRequest(mockRequest)
      store.clearActiveRequest()
      expect(store.getState().activeRequest).toBeNull()
    })
  })

  describe('History', () => {
    const mockHistoryEntry: HistoryEntry = {
      id: 'hist-123',
      request: {
        id: 'req-123',
        name: 'Test Request',
        method: 'GET',
        url: 'https://api.example.com',
        headers: [],
        params: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: {},
        body: '{}',
        time: 100,
        size: 2,
      },
      timestamp: '2024-01-01T00:00:00Z',
    }

    it('should start with empty history', () => {
      expect(store.getState().history).toEqual([])
    })

    it('should add history entry', () => {
      store.addHistoryEntry(mockHistoryEntry)
      expect(store.getState().history).toHaveLength(1)
    })

    it('should clear history', () => {
      store.addHistoryEntry(mockHistoryEntry)
      store.clearHistory()
      expect(store.getState().history).toHaveLength(0)
    })

    it('should limit history to max entries', () => {
      for (let i = 0; i < 150; i++) {
        store.addHistoryEntry({ ...mockHistoryEntry, id: `hist-${i}` })
      }
      // Default max is 100
      expect(store.getState().history.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Response', () => {
    it('should set response', () => {
      const response = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"message": "success"}',
        time: 150,
        size: 23,
      }
      store.setResponse(response)
      expect(store.getState().response).toEqual(response)
    })

    it('should clear response', () => {
      store.setResponse({
        status: 200,
        statusText: 'OK',
        headers: {},
        body: '',
        time: 0,
        size: 0,
      })
      store.clearResponse()
      expect(store.getState().response).toBeNull()
    })
  })

  describe('Loading state', () => {
    it('should set loading state', () => {
      store.setLoading(true)
      expect(store.getState().isLoading).toBe(true)
      store.setLoading(false)
      expect(store.getState().isLoading).toBe(false)
    })
  })

  describe('Subscribers', () => {
    it('should notify subscribers on state change', () => {
      let notified = false
      store.subscribe(() => {
        notified = true
      })
      store.setLoading(true)
      expect(notified).toBe(true)
    })

    it('should allow unsubscribing', () => {
      let count = 0
      const unsubscribe = store.subscribe(() => {
        count++
      })
      store.setLoading(true)
      unsubscribe()
      store.setLoading(false)
      expect(count).toBe(1)
    })
  })
})
