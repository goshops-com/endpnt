import { describe, it, expect, beforeEach } from 'vitest'
import { createInMemoryStorage, InMemoryStorageClient } from '../in-memory-storage'
import { createStorageClient } from '../storage-client'
import type { Collection, Environment, HistoryEntry } from '@/types'

describe('InMemoryStorageClient', () => {
  let storage: InMemoryStorageClient

  beforeEach(() => {
    storage = createInMemoryStorage()
  })

  describe('Collection operations', () => {
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

    it('should save a collection', async () => {
      const result = await storage.saveCollection('user-123', mockCollection)
      expect(result).toEqual({ success: true })
    })

    it('should generate correct S3 key for collection', () => {
      const key = storage.getCollectionKey('user-123', 'col-123')
      expect(key).toBe('users/user-123/collections/col-123.json')
    })

    it('should get a collection by id', async () => {
      await storage.saveCollection('user-123', mockCollection)
      const result = await storage.getCollection('user-123', 'col-123')
      expect(result).toEqual(mockCollection)
    })

    it('should return null for non-existent collection', async () => {
      const result = await storage.getCollection('user-123', 'non-existent')
      expect(result).toBeNull()
    })

    it('should list all collections for a user', async () => {
      const collection2: Collection = { ...mockCollection, id: 'col-456', name: 'Second Collection' }
      await storage.saveCollection('user-123', mockCollection)
      await storage.saveCollection('user-123', collection2)

      const result = await storage.listCollections('user-123')
      expect(result).toHaveLength(2)
      expect(result.map((c) => c.id)).toContain('col-123')
      expect(result.map((c) => c.id)).toContain('col-456')
    })

    it('should not list collections from other users', async () => {
      await storage.saveCollection('user-123', mockCollection)
      await storage.saveCollection('user-456', { ...mockCollection, id: 'col-other' })

      const result = await storage.listCollections('user-123')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('col-123')
    })

    it('should delete a collection', async () => {
      await storage.saveCollection('user-123', mockCollection)
      const result = await storage.deleteCollection('user-123', 'col-123')
      expect(result).toEqual({ success: true })

      const getResult = await storage.getCollection('user-123', 'col-123')
      expect(getResult).toBeNull()
    })

    it('should update an existing collection', async () => {
      await storage.saveCollection('user-123', mockCollection)
      const updated = { ...mockCollection, name: 'Updated Name' }
      await storage.saveCollection('user-123', updated)

      const result = await storage.getCollection('user-123', 'col-123')
      expect(result?.name).toBe('Updated Name')
    })
  })

  describe('Environment operations', () => {
    const mockEnvironment: Environment = {
      id: 'env-123',
      name: 'Development',
      variables: [{ id: 'var-1', key: 'BASE_URL', value: 'http://localhost:3000', enabled: true }],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    it('should save an environment', async () => {
      const result = await storage.saveEnvironment('user-123', mockEnvironment)
      expect(result).toEqual({ success: true })
    })

    it('should generate correct S3 key for environment', () => {
      const key = storage.getEnvironmentKey('user-123', 'env-123')
      expect(key).toBe('users/user-123/environments/env-123.json')
    })

    it('should get an environment by id', async () => {
      await storage.saveEnvironment('user-123', mockEnvironment)
      const result = await storage.getEnvironment('user-123', 'env-123')
      expect(result).toEqual(mockEnvironment)
    })

    it('should list all environments for a user', async () => {
      const env2: Environment = { ...mockEnvironment, id: 'env-456', name: 'Production' }
      await storage.saveEnvironment('user-123', mockEnvironment)
      await storage.saveEnvironment('user-123', env2)

      const result = await storage.listEnvironments('user-123')
      expect(result).toHaveLength(2)
    })

    it('should delete an environment', async () => {
      await storage.saveEnvironment('user-123', mockEnvironment)
      const result = await storage.deleteEnvironment('user-123', 'env-123')
      expect(result).toEqual({ success: true })

      const getResult = await storage.getEnvironment('user-123', 'env-123')
      expect(getResult).toBeNull()
    })
  })

  describe('History operations', () => {
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

    it('should save a history entry', async () => {
      const result = await storage.saveHistoryEntry('user-123', mockHistoryEntry)
      expect(result).toEqual({ success: true })
    })

    it('should generate correct S3 key for history entry', () => {
      const key = storage.getHistoryKey('user-123', 'hist-123')
      expect(key).toBe('users/user-123/history/hist-123.json')
    })

    it('should list history entries for a user sorted by timestamp', async () => {
      const entry1 = { ...mockHistoryEntry, id: 'hist-1', timestamp: '2024-01-01T00:00:00Z' }
      const entry2 = { ...mockHistoryEntry, id: 'hist-2', timestamp: '2024-01-02T00:00:00Z' }
      const entry3 = { ...mockHistoryEntry, id: 'hist-3', timestamp: '2024-01-03T00:00:00Z' }

      await storage.saveHistoryEntry('user-123', entry1)
      await storage.saveHistoryEntry('user-123', entry3)
      await storage.saveHistoryEntry('user-123', entry2)

      const result = await storage.listHistory('user-123')
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('hist-3') // Most recent first
      expect(result[2].id).toBe('hist-1') // Oldest last
    })

    it('should limit history entries', async () => {
      for (let i = 0; i < 10; i++) {
        await storage.saveHistoryEntry('user-123', {
          ...mockHistoryEntry,
          id: `hist-${i}`,
          timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        })
      }

      const result = await storage.listHistory('user-123', 5)
      expect(result).toHaveLength(5)
    })

    it('should clear history for a user', async () => {
      await storage.saveHistoryEntry('user-123', mockHistoryEntry)
      await storage.saveHistoryEntry('user-123', { ...mockHistoryEntry, id: 'hist-2' })

      const result = await storage.clearHistory('user-123')
      expect(result).toEqual({ success: true })

      const entries = await storage.listHistory('user-123')
      expect(entries).toHaveLength(0)
    })

    it('should not clear history from other users', async () => {
      await storage.saveHistoryEntry('user-123', mockHistoryEntry)
      await storage.saveHistoryEntry('user-456', { ...mockHistoryEntry, id: 'hist-other' })

      await storage.clearHistory('user-123')

      const user456History = await storage.listHistory('user-456')
      expect(user456History).toHaveLength(1)
    })
  })

  describe('Storage key generation', () => {
    it('should sanitize user IDs with slashes', () => {
      const key = storage.getCollectionKey('user/with/slashes', 'col-123')
      expect(key).toBe('users/user-with-slashes/collections/col-123.json')
    })

    it('should handle special characters in IDs', () => {
      const key = storage.getCollectionKey('user-123', 'col-with-special_chars.test')
      expect(key).toBe('users/user-123/collections/col-with-special_chars.test.json')
    })
  })
})

describe('StorageClient factory', () => {
  it('should create a storage client with valid config', () => {
    const storage = createStorageClient({
      endpoint: 'https://test.r2.cloudflarestorage.com',
      region: 'auto',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      bucket: 'test-bucket',
    })

    expect(storage).toBeDefined()
    expect(storage).toHaveProperty('saveCollection')
    expect(storage).toHaveProperty('getCollection')
    expect(storage).toHaveProperty('deleteCollection')
    expect(storage).toHaveProperty('listCollections')
    expect(storage).toHaveProperty('saveEnvironment')
    expect(storage).toHaveProperty('getEnvironment')
    expect(storage).toHaveProperty('saveHistoryEntry')
    expect(storage).toHaveProperty('listHistory')
  })
})
