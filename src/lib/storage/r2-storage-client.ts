import type { Collection, Environment, HistoryEntry, Team, UserProfile } from '@/types'
import type { StorageClient, StorageResult } from './storage-client'

// R2 bucket binding type for Cloudflare Workers
export interface R2Bucket {
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<R2Object | null>
  get(key: string): Promise<R2ObjectBody | null>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string }): Promise<R2Objects>
}

interface R2Object {
  key: string
  size: number
  etag: string
}

interface R2ObjectBody extends R2Object {
  text(): Promise<string>
  json<T>(): Promise<T>
}

interface R2Objects {
  objects: R2Object[]
  truncated: boolean
}

export class R2StorageClient implements StorageClient {
  private bucket: R2Bucket

  constructor(bucket: R2Bucket) {
    this.bucket = bucket
  }

  private sanitizeId(id: string): string {
    return id.replace(/\//g, '-')
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

  // Generic save method
  private async saveObject(key: string, data: unknown): Promise<StorageResult> {
    try {
      await this.bucket.put(key, JSON.stringify(data), {
        httpMetadata: { contentType: 'application/json' }
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Generic get method
  private async getObject<T>(key: string): Promise<T | null> {
    try {
      const object = await this.bucket.get(key)
      if (!object) return null
      return await object.json<T>()
    } catch {
      return null
    }
  }

  // Generic delete method
  private async deleteObject(key: string): Promise<StorageResult> {
    try {
      await this.bucket.delete(key)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Generic list method
  private async listObjects(prefix: string): Promise<string[]> {
    try {
      const result = await this.bucket.list({ prefix })
      return result.objects.map((obj) => obj.key)
    } catch {
      return []
    }
  }

  // Collection operations
  async saveCollection(userId: string, collection: Collection): Promise<StorageResult> {
    const key = this.getCollectionKey(userId, collection.id)
    return this.saveObject(key, collection)
  }

  async getCollection(userId: string, collectionId: string): Promise<Collection | null> {
    const key = this.getCollectionKey(userId, collectionId)
    return this.getObject<Collection>(key)
  }

  async deleteCollection(userId: string, collectionId: string): Promise<StorageResult> {
    const key = this.getCollectionKey(userId, collectionId)
    return this.deleteObject(key)
  }

  async listCollections(userId: string): Promise<Collection[]> {
    const prefix = `users/${this.sanitizeId(userId)}/collections/`
    const keys = await this.listObjects(prefix)
    const collections: Collection[] = []

    for (const key of keys) {
      const collectionId = key.replace(prefix, '').replace('.json', '')
      const collection = await this.getCollection(userId, collectionId)
      if (collection) {
        collections.push(collection)
      }
    }

    return collections
  }

  // Environment operations
  async saveEnvironment(userId: string, environment: Environment): Promise<StorageResult> {
    const key = this.getEnvironmentKey(userId, environment.id)
    return this.saveObject(key, environment)
  }

  async getEnvironment(userId: string, environmentId: string): Promise<Environment | null> {
    const key = this.getEnvironmentKey(userId, environmentId)
    return this.getObject<Environment>(key)
  }

  async deleteEnvironment(userId: string, environmentId: string): Promise<StorageResult> {
    const key = this.getEnvironmentKey(userId, environmentId)
    return this.deleteObject(key)
  }

  async listEnvironments(userId: string): Promise<Environment[]> {
    const prefix = `users/${this.sanitizeId(userId)}/environments/`
    const keys = await this.listObjects(prefix)
    const environments: Environment[] = []

    for (const key of keys) {
      const envId = key.replace(prefix, '').replace('.json', '')
      const environment = await this.getEnvironment(userId, envId)
      if (environment) {
        environments.push(environment)
      }
    }

    return environments
  }

  // History operations
  async saveHistoryEntry(userId: string, entry: HistoryEntry): Promise<StorageResult> {
    const key = this.getHistoryKey(userId, entry.id)
    return this.saveObject(key, entry)
  }

  async getHistoryEntry(userId: string, entryId: string): Promise<HistoryEntry | null> {
    const key = this.getHistoryKey(userId, entryId)
    return this.getObject<HistoryEntry>(key)
  }

  async deleteHistoryEntry(userId: string, entryId: string): Promise<StorageResult> {
    const key = this.getHistoryKey(userId, entryId)
    return this.deleteObject(key)
  }

  async listHistory(userId: string, limit?: number): Promise<HistoryEntry[]> {
    const prefix = `users/${this.sanitizeId(userId)}/history/`
    const keys = await this.listObjects(prefix)
    const entries: HistoryEntry[] = []

    const keysToFetch = limit ? keys.slice(0, limit) : keys

    for (const key of keysToFetch) {
      const entryId = key.replace(prefix, '').replace('.json', '')
      const entry = await this.getHistoryEntry(userId, entryId)
      if (entry) {
        entries.push(entry)
      }
    }

    // Sort by timestamp descending (most recent first)
    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  async clearHistory(userId: string): Promise<StorageResult> {
    const prefix = `users/${this.sanitizeId(userId)}/history/`
    const keys = await this.listObjects(prefix)

    try {
      for (const key of keys) {
        await this.bucket.delete(key)
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // User profile operations
  async saveUserProfile(profile: UserProfile): Promise<StorageResult> {
    const key = this.getUserProfileKey(profile.id)
    return this.saveObject(key, profile)
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const key = this.getUserProfileKey(userId)
    return this.getObject<UserProfile>(key)
  }

  // Team operations
  async saveTeam(team: Team): Promise<StorageResult> {
    const key = this.getTeamKey(team.id)
    return this.saveObject(key, team)
  }

  async getTeam(teamId: string): Promise<Team | null> {
    const key = this.getTeamKey(teamId)
    return this.getObject<Team>(key)
  }

  async deleteTeam(teamId: string): Promise<StorageResult> {
    const key = this.getTeamKey(teamId)
    return this.deleteObject(key)
  }

  async listUserTeams(userId: string): Promise<Team[]> {
    // First get the user's profile to get their team IDs
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
    return this.saveObject(key, collection)
  }

  async getTeamCollection(teamId: string, collectionId: string): Promise<Collection | null> {
    const key = this.getTeamCollectionKey(teamId, collectionId)
    return this.getObject<Collection>(key)
  }

  async deleteTeamCollection(teamId: string, collectionId: string): Promise<StorageResult> {
    const key = this.getTeamCollectionKey(teamId, collectionId)
    return this.deleteObject(key)
  }

  async listTeamCollections(teamId: string): Promise<Collection[]> {
    const prefix = `teams/${this.sanitizeId(teamId)}/collections/`
    const keys = await this.listObjects(prefix)
    const collections: Collection[] = []

    for (const key of keys) {
      const collectionId = key.replace(prefix, '').replace('.json', '')
      const collection = await this.getTeamCollection(teamId, collectionId)
      if (collection) {
        collections.push(collection)
      }
    }

    return collections
  }

  // Team environment operations
  async saveTeamEnvironment(teamId: string, environment: Environment): Promise<StorageResult> {
    const key = this.getTeamEnvironmentKey(teamId, environment.id)
    return this.saveObject(key, environment)
  }

  async getTeamEnvironment(teamId: string, environmentId: string): Promise<Environment | null> {
    const key = this.getTeamEnvironmentKey(teamId, environmentId)
    return this.getObject<Environment>(key)
  }

  async deleteTeamEnvironment(teamId: string, environmentId: string): Promise<StorageResult> {
    const key = this.getTeamEnvironmentKey(teamId, environmentId)
    return this.deleteObject(key)
  }

  async listTeamEnvironments(teamId: string): Promise<Environment[]> {
    const prefix = `teams/${this.sanitizeId(teamId)}/environments/`
    const keys = await this.listObjects(prefix)
    const environments: Environment[] = []

    for (const key of keys) {
      const envId = key.replace(prefix, '').replace('.json', '')
      const environment = await this.getTeamEnvironment(teamId, envId)
      if (environment) {
        environments.push(environment)
      }
    }

    return environments
  }
}

// Factory function to create R2 storage client from env binding
export function createR2StorageClient(bucket: R2Bucket): StorageClient {
  return new R2StorageClient(bucket)
}
