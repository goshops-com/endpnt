import { describe, it, expect, beforeEach } from 'vitest'
import { createInMemoryStorage } from '../in-memory-storage'
import type { Team, UserProfile, Collection, Environment } from '@/types'

describe('Team Storage', () => {
  let storage: ReturnType<typeof createInMemoryStorage>

  beforeEach(() => {
    storage = createInMemoryStorage()
  })

  describe('User Profile', () => {
    it('should save and retrieve a user profile', async () => {
      const profile: UserProfile = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        personalWorkspaceId: 'workspace-1',
        teams: ['team-1', 'team-2'],
        activeTeamId: 'team-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = await storage.saveUserProfile(profile)
      expect(result.success).toBe(true)

      const retrieved = await storage.getUserProfile('user-1')
      expect(retrieved).toEqual(profile)
    })

    it('should return null for non-existent profile', async () => {
      const profile = await storage.getUserProfile('non-existent')
      expect(profile).toBeNull()
    })

    it('should update an existing profile', async () => {
      const profile: UserProfile = {
        id: 'user-1',
        email: 'user@example.com',
        personalWorkspaceId: 'workspace-1',
        teams: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.saveUserProfile(profile)

      profile.teams = ['team-1']
      profile.activeTeamId = 'team-1'
      await storage.saveUserProfile(profile)

      const retrieved = await storage.getUserProfile('user-1')
      expect(retrieved?.teams).toEqual(['team-1'])
      expect(retrieved?.activeTeamId).toBe('team-1')
    })
  })

  describe('Team Operations', () => {
    it('should save and retrieve a team', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Test Team',
        description: 'A test team',
        members: [
          {
            userId: 'user-1',
            email: 'owner@example.com',
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

      const result = await storage.saveTeam(team)
      expect(result.success).toBe(true)

      const retrieved = await storage.getTeam('team-1')
      expect(retrieved).toEqual(team)
    })

    it('should delete a team', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Test Team',
        members: [],
        invitations: [],
        sharedCollections: [],
        sharedEnvironments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.saveTeam(team)
      const deleteResult = await storage.deleteTeam('team-1')
      expect(deleteResult.success).toBe(true)

      const retrieved = await storage.getTeam('team-1')
      expect(retrieved).toBeNull()
    })

    it('should list teams for a user', async () => {
      // Create user profile with teams
      const profile: UserProfile = {
        id: 'user-1',
        email: 'user@example.com',
        personalWorkspaceId: 'workspace-1',
        teams: ['team-1', 'team-2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await storage.saveUserProfile(profile)

      // Create teams
      const team1: Team = {
        id: 'team-1',
        name: 'Team One',
        members: [{ userId: 'user-1', email: 'user@example.com', role: 'owner', joinedAt: new Date().toISOString() }],
        invitations: [],
        sharedCollections: [],
        sharedEnvironments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const team2: Team = {
        id: 'team-2',
        name: 'Team Two',
        members: [{ userId: 'user-1', email: 'user@example.com', role: 'member', joinedAt: new Date().toISOString() }],
        invitations: [],
        sharedCollections: [],
        sharedEnvironments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.saveTeam(team1)
      await storage.saveTeam(team2)

      const teams = await storage.listUserTeams('user-1')
      expect(teams).toHaveLength(2)
      expect(teams.map(t => t.name)).toContain('Team One')
      expect(teams.map(t => t.name)).toContain('Team Two')
    })

    it('should return empty array for user with no teams', async () => {
      const profile: UserProfile = {
        id: 'user-1',
        email: 'user@example.com',
        personalWorkspaceId: 'workspace-1',
        teams: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await storage.saveUserProfile(profile)

      const teams = await storage.listUserTeams('user-1')
      expect(teams).toHaveLength(0)
    })
  })

  describe('Team Collections', () => {
    const teamId = 'team-1'

    it('should save and retrieve a team collection', async () => {
      const collection: Collection = {
        id: 'col-1',
        name: 'Shared Collection',
        requests: [],
        folders: [],
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = await storage.saveTeamCollection(teamId, collection)
      expect(result.success).toBe(true)

      const retrieved = await storage.getTeamCollection(teamId, 'col-1')
      expect(retrieved).toEqual(collection)
    })

    it('should list all team collections', async () => {
      const col1: Collection = {
        id: 'col-1',
        name: 'Collection 1',
        requests: [],
        folders: [],
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const col2: Collection = {
        id: 'col-2',
        name: 'Collection 2',
        requests: [],
        folders: [],
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.saveTeamCollection(teamId, col1)
      await storage.saveTeamCollection(teamId, col2)

      const collections = await storage.listTeamCollections(teamId)
      expect(collections).toHaveLength(2)
    })

    it('should delete a team collection', async () => {
      const collection: Collection = {
        id: 'col-1',
        name: 'To Delete',
        requests: [],
        folders: [],
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.saveTeamCollection(teamId, collection)
      const deleteResult = await storage.deleteTeamCollection(teamId, 'col-1')
      expect(deleteResult.success).toBe(true)

      const retrieved = await storage.getTeamCollection(teamId, 'col-1')
      expect(retrieved).toBeNull()
    })

    it('should isolate collections between teams', async () => {
      const collection: Collection = {
        id: 'col-1',
        name: 'Team 1 Collection',
        requests: [],
        folders: [],
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.saveTeamCollection('team-1', collection)

      const team1Col = await storage.getTeamCollection('team-1', 'col-1')
      const team2Col = await storage.getTeamCollection('team-2', 'col-1')

      expect(team1Col).not.toBeNull()
      expect(team2Col).toBeNull()
    })
  })

  describe('Team Environments', () => {
    const teamId = 'team-1'

    it('should save and retrieve a team environment', async () => {
      const env: Environment = {
        id: 'env-1',
        name: 'Shared Environment',
        variables: [
          { id: 'var-1', key: 'API_URL', value: 'https://api.example.com', enabled: true },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = await storage.saveTeamEnvironment(teamId, env)
      expect(result.success).toBe(true)

      const retrieved = await storage.getTeamEnvironment(teamId, 'env-1')
      expect(retrieved).toEqual(env)
    })

    it('should list all team environments', async () => {
      const env1: Environment = {
        id: 'env-1',
        name: 'Development',
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const env2: Environment = {
        id: 'env-2',
        name: 'Production',
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.saveTeamEnvironment(teamId, env1)
      await storage.saveTeamEnvironment(teamId, env2)

      const environments = await storage.listTeamEnvironments(teamId)
      expect(environments).toHaveLength(2)
    })

    it('should delete a team environment', async () => {
      const env: Environment = {
        id: 'env-1',
        name: 'To Delete',
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.saveTeamEnvironment(teamId, env)
      const deleteResult = await storage.deleteTeamEnvironment(teamId, 'env-1')
      expect(deleteResult.success).toBe(true)

      const retrieved = await storage.getTeamEnvironment(teamId, 'env-1')
      expect(retrieved).toBeNull()
    })
  })

  describe('Key Generation', () => {
    it('should generate correct user profile key', () => {
      const key = storage.getUserProfileKey('user-123')
      expect(key).toBe('users/user-123/profile.json')
    })

    it('should generate correct team key', () => {
      const key = storage.getTeamKey('team-456')
      expect(key).toBe('teams/team-456/team.json')
    })

    it('should generate correct team collection key', () => {
      const key = storage.getTeamCollectionKey('team-1', 'col-1')
      expect(key).toBe('teams/team-1/collections/col-1.json')
    })

    it('should generate correct team environment key', () => {
      const key = storage.getTeamEnvironmentKey('team-1', 'env-1')
      expect(key).toBe('teams/team-1/environments/env-1.json')
    })

    it('should sanitize IDs with slashes', () => {
      const key = storage.getUserProfileKey('user/with/slashes')
      expect(key).toBe('users/user-with-slashes/profile.json')
    })
  })
})
