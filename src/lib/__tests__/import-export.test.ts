import { describe, it, expect } from 'vitest'
import { exportToPostman, importFromPostman, parseImportedFile } from '../import-export'
import type { Collection } from '@/types'

describe('Import/Export', () => {
  const mockCollection: Collection = {
    id: 'col-123',
    name: 'Test Collection',
    description: 'A test collection',
    requests: [
      {
        id: 'req-1',
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [
          { id: 'h-1', key: 'Authorization', value: 'Bearer token', enabled: true },
        ],
        params: [
          { id: 'p-1', key: 'page', value: '1', enabled: true },
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'req-2',
        name: 'Create User',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: [
          { id: 'h-2', key: 'Content-Type', value: 'application/json', enabled: true },
        ],
        params: [],
        body: {
          type: 'json',
          content: '{"name": "John"}',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
    folders: [
      {
        id: 'folder-1',
        name: 'Admin',
        requests: [
          {
            id: 'req-3',
            name: 'Delete User',
            method: 'DELETE',
            url: 'https://api.example.com/users/1',
            headers: [],
            params: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        folders: [],
      },
    ],
    variables: [
      { id: 'v-1', key: 'base_url', value: 'https://api.example.com', enabled: true },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  describe('exportToPostman', () => {
    it('should export collection info', () => {
      const result = exportToPostman(mockCollection)
      expect(result.info.name).toBe('Test Collection')
      expect(result.info.description).toBe('A test collection')
      expect(result.info.schema).toContain('getpostman.com')
    })

    it('should export requests with correct method and URL', () => {
      const result = exportToPostman(mockCollection)
      expect(result.item).toHaveLength(3) // 2 requests + 1 folder
      expect(result.item[0].name).toBe('Get Users')
      expect(result.item[0].request?.method).toBe('GET')
    })

    it('should export headers', () => {
      const result = exportToPostman(mockCollection)
      const firstRequest = result.item[0]
      expect(firstRequest.request?.header).toHaveLength(1)
      expect(firstRequest.request?.header?.[0].key).toBe('Authorization')
    })

    it('should export query params', () => {
      const result = exportToPostman(mockCollection)
      const firstRequest = result.item[0]
      const url = firstRequest.request?.url
      expect(typeof url).not.toBe('string')
      if (typeof url !== 'string') {
        expect(url?.query).toHaveLength(1)
        expect(url?.query?.[0].key).toBe('page')
      }
    })

    it('should export JSON body', () => {
      const result = exportToPostman(mockCollection)
      const postRequest = result.item[1]
      expect(postRequest.request?.body?.mode).toBe('raw')
      expect(postRequest.request?.body?.raw).toBe('{"name": "John"}')
      expect(postRequest.request?.body?.options?.raw?.language).toBe('json')
    })

    it('should export folders', () => {
      const result = exportToPostman(mockCollection)
      const folder = result.item[2]
      expect(folder.name).toBe('Admin')
      expect(folder.item).toHaveLength(1)
      expect(folder.item?.[0].name).toBe('Delete User')
    })

    it('should export collection variables', () => {
      const result = exportToPostman(mockCollection)
      expect(result.variable).toHaveLength(1)
      expect(result.variable?.[0].key).toBe('base_url')
    })
  })

  describe('importFromPostman', () => {
    const postmanCollection = {
      info: {
        name: 'Imported Collection',
        description: 'From Postman',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Get Posts',
          request: {
            method: 'GET',
            header: [
              { key: 'Accept', value: 'application/json' },
            ],
            url: {
              raw: 'https://api.test.com/posts',
              query: [
                { key: 'limit', value: '10' },
              ],
            },
          },
        },
        {
          name: 'Auth Folder',
          item: [
            {
              name: 'Login',
              request: {
                method: 'POST',
                body: {
                  mode: 'raw' as const,
                  raw: '{"email": "test@test.com"}',
                  options: { raw: { language: 'json' } },
                },
                url: 'https://api.test.com/login',
              },
            },
          ],
        },
      ],
      variable: [
        { key: 'api_key', value: 'secret123' },
      ],
    }

    it('should import collection name and description', () => {
      const result = importFromPostman(postmanCollection)
      expect(result.name).toBe('Imported Collection')
      expect(result.description).toBe('From Postman')
    })

    it('should import requests', () => {
      const result = importFromPostman(postmanCollection)
      expect(result.requests).toHaveLength(1)
      expect(result.requests[0].name).toBe('Get Posts')
      expect(result.requests[0].method).toBe('GET')
    })

    it('should import headers', () => {
      const result = importFromPostman(postmanCollection)
      expect(result.requests[0].headers).toHaveLength(1)
      expect(result.requests[0].headers[0].key).toBe('Accept')
    })

    it('should import query params', () => {
      const result = importFromPostman(postmanCollection)
      expect(result.requests[0].params).toHaveLength(1)
      expect(result.requests[0].params[0].key).toBe('limit')
    })

    it('should import folders', () => {
      const result = importFromPostman(postmanCollection)
      expect(result.folders).toHaveLength(1)
      expect(result.folders[0].name).toBe('Auth Folder')
      expect(result.folders[0].requests).toHaveLength(1)
    })

    it('should import JSON body', () => {
      const result = importFromPostman(postmanCollection)
      const loginRequest = result.folders[0].requests[0]
      expect(loginRequest.body?.type).toBe('json')
      expect(loginRequest.body?.content).toBe('{"email": "test@test.com"}')
    })

    it('should import collection variables', () => {
      const result = importFromPostman(postmanCollection)
      expect(result.variables).toHaveLength(1)
      expect(result.variables[0].key).toBe('api_key')
    })

    it('should generate new IDs for imported items', () => {
      const result = importFromPostman(postmanCollection)
      expect(result.id).toBeDefined()
      expect(result.requests[0].id).toBeDefined()
      expect(result.folders[0].id).toBeDefined()
    })
  })

  describe('parseImportedFile', () => {
    it('should detect and parse Postman format', () => {
      const postmanJson = JSON.stringify({
        info: {
          name: 'Postman Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [],
      })

      const result = parseImportedFile(postmanJson)
      expect(result.name).toBe('Postman Collection')
    })

    it('should detect and parse native format', () => {
      const nativeJson = JSON.stringify(mockCollection)
      const result = parseImportedFile(nativeJson)
      expect(result.name).toBe('Test Collection')
      expect(result.id).toBe('col-123')
    })

    it('should throw error for unrecognized format', () => {
      const invalidJson = JSON.stringify({ foo: 'bar' })
      expect(() => parseImportedFile(invalidJson)).toThrow('Unrecognized collection format')
    })

    it('should throw error for invalid JSON', () => {
      expect(() => parseImportedFile('not json')).toThrow()
    })
  })

  describe('Round-trip conversion', () => {
    it('should preserve data through export and import', () => {
      const exported = exportToPostman(mockCollection)
      const imported = importFromPostman(exported)

      // Check basic info
      expect(imported.name).toBe(mockCollection.name)
      expect(imported.description).toBe(mockCollection.description)

      // Check requests count
      expect(imported.requests.length).toBe(mockCollection.requests.length)

      // Check folder structure
      expect(imported.folders.length).toBe(mockCollection.folders.length)
      expect(imported.folders[0].name).toBe(mockCollection.folders[0].name)

      // Check variables
      expect(imported.variables.length).toBe(mockCollection.variables.length)
      expect(imported.variables[0].key).toBe(mockCollection.variables[0].key)
    })
  })
})
