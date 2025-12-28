import type { Collection, Environment, HistoryEntry, Team, UserProfile } from '@/types'
import type { StorageClient, StorageResult } from './storage-client'

export interface InMemoryStorageClient extends StorageClient {
  clear(): void
}

class InMemoryStorage implements InMemoryStorageClient {
  private data: Map<string, string> = new Map()

  private sanitizeId(id: string): string {
    return id.replace(/\//g, '-')
  }

  clear(): void {
    this.data.clear()
  }

  // Key generation methods
  getCollectionKey(userId: string, collectionId: string): string {
    return `users/${this.sanitizeId(userId)}/collections/${collectionId}.json`
  }

  getEnvironmentKey(userId: string, environmentId: string): string {
    return `users/${this.sanitizeId(userId)}/environments/${environmentId}.json`
  }

  getHistoryKey(userId: string, entryId: string): string {
    return `users/${this.sanitizeId(userId)}/history/${entryId}.json`
  }

  getUserProfileKey(userId: string): string {
    return `users/${this.sanitizeId(userId)}/profile.json`
  }

  getTeamKey(teamId: string): string {
    return `teams/${this.sanitizeId(teamId)}/team.json`
  }

  getTeamCollectionKey(teamId: string, collectionId: string): string {
    return `teams/${this.sanitizeId(teamId)}/collections/${collectionId}.json`
  }

  getTeamEnvironmentKey(teamId: string, environmentId: string): string {
    return `teams/${this.sanitizeId(teamId)}/environments/${environmentId}.json`
  }

  // Collection operations
  async saveCollection(userId: string, collection: Collection): Promise<StorageResult> {
    const key = this.getCollectionKey(userId, collection.id)
    this.data.set(key, JSON.stringify(collection))
    return { success: true }
  }

  async getCollection(userId: string, collectionId: string): Promise<Collection | null> {
    const key = this.getCollectionKey(userId, collectionId)
    const data = this.data.get(key)
    if (!data) return null
    return JSON.parse(data) as Collection
  }

  async deleteCollection(userId: string, collectionId: string): Promise<StorageResult> {
    const key = this.getCollectionKey(userId, collectionId)
    this.data.delete(key)
    return { success: true }
  }

  async listCollections(userId: string): Promise<Collection[]> {
    const prefix = `users/${this.sanitizeId(userId)}/collections/`
    const collections: Collection[] = []

    for (const [key, value] of this.data.entries()) {
      if (key.startsWith(prefix)) {
        collections.push(JSON.parse(value) as Collection)
      }
    }

    return collections
  }

  // Environment operations
  async saveEnvironment(userId: string, environment: Environment): Promise<StorageResult> {
    const key = this.getEnvironmentKey(userId, environment.id)
    this.data.set(key, JSON.stringify(environment))
    return { success: true }
  }

  async getEnvironment(userId: string, environmentId: string): Promise<Environment | null> {
    const key = this.getEnvironmentKey(userId, environmentId)
    const data = this.data.get(key)
    if (!data) return null
    return JSON.parse(data) as Environment
  }

  async deleteEnvironment(userId: string, environmentId: string): Promise<StorageResult> {
    const key = this.getEnvironmentKey(userId, environmentId)
    this.data.delete(key)
    return { success: true }
  }

  async listEnvironments(userId: string): Promise<Environment[]> {
    const prefix = `users/${this.sanitizeId(userId)}/environments/`
    const environments: Environment[] = []

    for (const [key, value] of this.data.entries()) {
      if (key.startsWith(prefix)) {
        environments.push(JSON.parse(value) as Environment)
      }
    }

    return environments
  }

  // History operations
  async saveHistoryEntry(userId: string, entry: HistoryEntry): Promise<StorageResult> {
    const key = this.getHistoryKey(userId, entry.id)
    this.data.set(key, JSON.stringify(entry))
    return { success: true }
  }

  async getHistoryEntry(userId: string, entryId: string): Promise<HistoryEntry | null> {
    const key = this.getHistoryKey(userId, entryId)
    const data = this.data.get(key)
    if (!data) return null
    return JSON.parse(data) as HistoryEntry
  }

  async deleteHistoryEntry(userId: string, entryId: string): Promise<StorageResult> {
    const key = this.getHistoryKey(userId, entryId)
    this.data.delete(key)
    return { success: true }
  }

  async listHistory(userId: string, limit?: number): Promise<HistoryEntry[]> {
    const prefix = `users/${this.sanitizeId(userId)}/history/`
    const entries: HistoryEntry[] = []

    for (const [key, value] of this.data.entries()) {
      if (key.startsWith(prefix)) {
        entries.push(JSON.parse(value) as HistoryEntry)
      }
    }

    // Sort by timestamp descending (most recent first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (limit) {
      return entries.slice(0, limit)
    }

    return entries
  }

  async clearHistory(userId: string): Promise<StorageResult> {
    const prefix = `users/${this.sanitizeId(userId)}/history/`
    const keysToDelete: string[] = []

    for (const key of this.data.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.data.delete(key)
    }

    return { success: true }
  }

  // User profile operations
  async saveUserProfile(profile: UserProfile): Promise<StorageResult> {
    const key = this.getUserProfileKey(profile.id)
    this.data.set(key, JSON.stringify(profile))
    return { success: true }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const key = this.getUserProfileKey(userId)
    const data = this.data.get(key)
    if (!data) return null
    return JSON.parse(data) as UserProfile
  }

  // Team operations
  async saveTeam(team: Team): Promise<StorageResult> {
    const key = this.getTeamKey(team.id)
    this.data.set(key, JSON.stringify(team))
    return { success: true }
  }

  async getTeam(teamId: string): Promise<Team | null> {
    const key = this.getTeamKey(teamId)
    const data = this.data.get(key)
    if (!data) return null
    return JSON.parse(data) as Team
  }

  async deleteTeam(teamId: string): Promise<StorageResult> {
    const key = this.getTeamKey(teamId)
    this.data.delete(key)
    return { success: true }
  }

  async listUserTeams(userId: string): Promise<Team[]> {
    const profile = await this.getUserProfile(userId)
    if (!profile || !profile.teams.length) {
      return []
    }

    const teams: Team[] = []
    for (const teamId of profile.teams) {
      const team = await this.getTeam(teamId)
      if (team) {
        teams.push(team)
      }
    }

    return teams
  }

  // Team collection operations
  async saveTeamCollection(teamId: string, collection: Collection): Promise<StorageResult> {
    const key = this.getTeamCollectionKey(teamId, collection.id)
    this.data.set(key, JSON.stringify(collection))
    return { success: true }
  }

  async getTeamCollection(teamId: string, collectionId: string): Promise<Collection | null> {
    const key = this.getTeamCollectionKey(teamId, collectionId)
    const data = this.data.get(key)
    if (!data) return null
    return JSON.parse(data) as Collection
  }

  async deleteTeamCollection(teamId: string, collectionId: string): Promise<StorageResult> {
    const key = this.getTeamCollectionKey(teamId, collectionId)
    this.data.delete(key)
    return { success: true }
  }

  async listTeamCollections(teamId: string): Promise<Collection[]> {
    const prefix = `teams/${this.sanitizeId(teamId)}/collections/`
    const collections: Collection[] = []

    for (const [key, value] of this.data.entries()) {
      if (key.startsWith(prefix)) {
        collections.push(JSON.parse(value) as Collection)
      }
    }

    return collections
  }

  // Team environment operations
  async saveTeamEnvironment(teamId: string, environment: Environment): Promise<StorageResult> {
    const key = this.getTeamEnvironmentKey(teamId, environment.id)
    this.data.set(key, JSON.stringify(environment))
    return { success: true }
  }

  async getTeamEnvironment(teamId: string, environmentId: string): Promise<Environment | null> {
    const key = this.getTeamEnvironmentKey(teamId, environmentId)
    const data = this.data.get(key)
    if (!data) return null
    return JSON.parse(data) as Environment
  }

  async deleteTeamEnvironment(teamId: string, environmentId: string): Promise<StorageResult> {
    const key = this.getTeamEnvironmentKey(teamId, environmentId)
    this.data.delete(key)
    return { success: true }
  }

  async listTeamEnvironments(teamId: string): Promise<Environment[]> {
    const prefix = `teams/${this.sanitizeId(teamId)}/environments/`
    const environments: Environment[] = []

    for (const [key, value] of this.data.entries()) {
      if (key.startsWith(prefix)) {
        environments.push(JSON.parse(value) as Environment)
      }
    }

    return environments
  }
}

export function createInMemoryStorage(): InMemoryStorageClient {
  return new InMemoryStorage()
}
