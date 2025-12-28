import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createStorageClient, type StorageConfig, type StorageClient } from '../storage-client'
import type { Collection, Environment, HistoryEntry, Team, UserProfile } from '@/types'

// Integration tests against real MinIO S3
// Run with: S3_INTEGRATION=true pnpm test s3-integration

const isIntegrationTest = process.env.S3_INTEGRATION === 'true'

const testConfig: StorageConfig = {
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
  bucket: 'postman-test',
}

describe.skipIf(!isIntegrationTest)('S3 Storage Integration Tests', () => {
  let storage: StorageClient
  const testUserId = 'test-user-' + Date.now()
  const testTeamId = 'test-team-' + Date.now()

  beforeAll(() => {
    storage = createStorageClient(testConfig)
  })

  describe('Collection Operations', () => {
    const collection: Collection = {
      id: 'col-' + Date.now(),
      name: 'Test Collection',
      description: 'Integration test collection',
      requests: [
        {
          id: 'req-1',
          name: 'Get Users',
          method: 'GET',
          url: 'https://api.example.com/users',
          headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer token', enabled: true }],
          params: [],
          body: { type: 'none' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      folders: [],
      variables: [{ id: 'v1', key: 'baseUrl', value: 'https://api.example.com', enabled: true }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should save a collection to S3', async () => {
      const result = await storage.saveCollection(testUserId, collection)
      expect(result.success).toBe(true)
    })

    it('should retrieve a collection from S3', async () => {
      const retrieved = await storage.getCollection(testUserId, collection.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('Test Collection')
      expect(retrieved?.requests).toHaveLength(1)
      expect(retrieved?.requests[0].name).toBe('Get Users')
    })

    it('should list collections for a user', async () => {
      // Save another collection
      const col2: Collection = {
        id: 'col-2-' + Date.now(),
        name: 'Second Collection',
        requests: [],
        folders: [],
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await storage.saveCollection(testUserId, col2)

      const collections = await storage.listCollections(testUserId)
      expect(collections.length).toBeGreaterThanOrEqual(2)
    })

    it('should delete a collection from S3', async () => {
      const result = await storage.deleteCollection(testUserId, collection.id)
      expect(result.success).toBe(true)

      const retrieved = await storage.getCollection(testUserId, collection.id)
      expect(retrieved).toBeNull()
    })
  })

  describe('Environment Operations', () => {
    const environment: Environment = {
      id: 'env-' + Date.now(),
      name: 'Development',
      variables: [
        { id: 'v1', key: 'API_URL', value: 'https://dev.api.example.com', enabled: true },
        { id: 'v2', key: 'API_KEY', value: 'dev-secret-key', enabled: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should save an environment to S3', async () => {
      const result = await storage.saveEnvironment(testUserId, environment)
      expect(result.success).toBe(true)
    })

    it('should retrieve an environment from S3', async () => {
      const retrieved = await storage.getEnvironment(testUserId, environment.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('Development')
      expect(retrieved?.variables).toHaveLength(2)
    })

    it('should list environments for a user', async () => {
      const environments = await storage.listEnvironments(testUserId)
      expect(environments.length).toBeGreaterThanOrEqual(1)
    })

    it('should delete an environment from S3', async () => {
      const result = await storage.deleteEnvironment(testUserId, environment.id)
      expect(result.success).toBe(true)

      const retrieved = await storage.getEnvironment(testUserId, environment.id)
      expect(retrieved).toBeNull()
    })
  })

  describe('History Operations', () => {
    const historyEntry: HistoryEntry = {
      id: 'hist-' + Date.now(),
      request: {
        id: 'req-1',
        name: 'Test Request',
        method: 'POST',
        url: 'https://api.example.com/data',
        headers: [],
        params: [],
        body: { type: 'json', content: '{"test": true}' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"success": true}',
        time: 150,
        size: 18,
      },
      timestamp: new Date().toISOString(),
    }

    it('should save a history entry to S3', async () => {
      const result = await storage.saveHistoryEntry(testUserId, historyEntry)
      expect(result.success).toBe(true)
    })

    it('should retrieve a history entry from S3', async () => {
      const retrieved = await storage.getHistoryEntry(testUserId, historyEntry.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.request.method).toBe('POST')
      expect(retrieved?.response.status).toBe(200)
    })

    it('should list history entries', async () => {
      // Add another entry
      const entry2: HistoryEntry = {
        ...historyEntry,
        id: 'hist-2-' + Date.now(),
        timestamp: new Date(Date.now() + 1000).toISOString(),
      }
      await storage.saveHistoryEntry(testUserId, entry2)

      const history = await storage.listHistory(testUserId)
      expect(history.length).toBeGreaterThanOrEqual(2)
      // Should be sorted by timestamp descending
      expect(new Date(history[0].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(history[1].timestamp).getTime()
      )
    })

    it('should clear history', async () => {
      const result = await storage.clearHistory(testUserId)
      expect(result.success).toBe(true)

      const history = await storage.listHistory(testUserId)
      expect(history).toHaveLength(0)
    })
  })

  describe('User Profile Operations', () => {
    const profile: UserProfile = {
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
      personalWorkspaceId: 'ws-' + Date.now(),
      teams: [testTeamId],
      activeTeamId: testTeamId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should save a user profile to S3', async () => {
      const result = await storage.saveUserProfile(profile)
      expect(result.success).toBe(true)
    })

    it('should retrieve a user profile from S3', async () => {
      const retrieved = await storage.getUserProfile(testUserId)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.email).toBe('test@example.com')
      expect(retrieved?.teams).toContain(testTeamId)
    })
  })

  describe('Team Operations', () => {
    const team: Team = {
      id: testTeamId,
      name: 'Test Team',
      description: 'Integration test team',
      members: [
        {
          userId: testUserId,
          email: 'test@example.com',
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
      invitations: [],
      sharedCollections: [],
      sharedEnvironments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should save a team to S3', async () => {
      const result = await storage.saveTeam(team)
      expect(result.success).toBe(true)
    })

    it('should retrieve a team from S3', async () => {
      const retrieved = await storage.getTeam(testTeamId)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('Test Team')
      expect(retrieved?.members).toHaveLength(1)
      expect(retrieved?.members[0].role).toBe('owner')
    })

    it('should list teams for a user', async () => {
      const teams = await storage.listUserTeams(testUserId)
      expect(teams.length).toBeGreaterThanOrEqual(1)
      expect(teams.some(t => t.id === testTeamId)).toBe(true)
    })

    it('should delete a team from S3', async () => {
      const result = await storage.deleteTeam(testTeamId)
      expect(result.success).toBe(true)

      const retrieved = await storage.getTeam(testTeamId)
      expect(retrieved).toBeNull()
    })
  })

  describe('Team Collection Operations', () => {
    const teamId = 'team-col-test-' + Date.now()
    const collection: Collection = {
      id: 'shared-col-' + Date.now(),
      name: 'Shared Team Collection',
      requests: [],
      folders: [],
      variables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should save a team collection to S3', async () => {
      const result = await storage.saveTeamCollection(teamId, collection)
      expect(result.success).toBe(true)
    })

    it('should retrieve a team collection from S3', async () => {
      const retrieved = await storage.getTeamCollection(teamId, collection.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('Shared Team Collection')
    })

    it('should list team collections', async () => {
      const collections = await storage.listTeamCollections(teamId)
      expect(collections.length).toBeGreaterThanOrEqual(1)
    })

    it('should delete a team collection from S3', async () => {
      const result = await storage.deleteTeamCollection(teamId, collection.id)
      expect(result.success).toBe(true)

      const retrieved = await storage.getTeamCollection(teamId, collection.id)
      expect(retrieved).toBeNull()
    })
  })

  describe('Team Environment Operations', () => {
    const teamId = 'team-env-test-' + Date.now()
    const environment: Environment = {
      id: 'shared-env-' + Date.now(),
      name: 'Shared Production',
      variables: [
        { id: 'v1', key: 'PROD_URL', value: 'https://prod.api.example.com', enabled: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    it('should save a team environment to S3', async () => {
      const result = await storage.saveTeamEnvironment(teamId, environment)
      expect(result.success).toBe(true)
    })

    it('should retrieve a team environment from S3', async () => {
      const retrieved = await storage.getTeamEnvironment(teamId, environment.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('Shared Production')
    })

    it('should list team environments', async () => {
      const environments = await storage.listTeamEnvironments(teamId)
      expect(environments.length).toBeGreaterThanOrEqual(1)
    })

    it('should delete a team environment from S3', async () => {
      const result = await storage.deleteTeamEnvironment(teamId, environment.id)
      expect(result.success).toBe(true)

      const retrieved = await storage.getTeamEnvironment(teamId, environment.id)
      expect(retrieved).toBeNull()
    })
  })
})
