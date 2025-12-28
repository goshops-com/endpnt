import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import type { Collection, Environment, HistoryEntry, Team, UserProfile } from '@/types'

export interface StorageConfig {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

export interface StorageResult {
  success: boolean
  error?: string
}

export interface StorageClient {
  // Collection operations
  saveCollection(userId: string, collection: Collection): Promise<StorageResult>
  getCollection(userId: string, collectionId: string): Promise<Collection | null>
  deleteCollection(userId: string, collectionId: string): Promise<StorageResult>
  listCollections(userId: string): Promise<Collection[]>
  getCollectionKey(userId: string, collectionId: string): string

  // Environment operations
  saveEnvironment(userId: string, environment: Environment): Promise<StorageResult>
  getEnvironment(userId: string, environmentId: string): Promise<Environment | null>
  deleteEnvironment(userId: string, environmentId: string): Promise<StorageResult>
  listEnvironments(userId: string): Promise<Environment[]>
  getEnvironmentKey(userId: string, environmentId: string): string

  // History operations
  saveHistoryEntry(userId: string, entry: HistoryEntry): Promise<StorageResult>
  getHistoryEntry(userId: string, entryId: string): Promise<HistoryEntry | null>
  deleteHistoryEntry(userId: string, entryId: string): Promise<StorageResult>
  listHistory(userId: string, limit?: number): Promise<HistoryEntry[]>
  clearHistory(userId: string): Promise<StorageResult>
  getHistoryKey(userId: string, entryId: string): string

  // User profile operations
  saveUserProfile(profile: UserProfile): Promise<StorageResult>
  getUserProfile(userId: string): Promise<UserProfile | null>
  getUserProfileKey(userId: string): string

  // Team operations
  saveTeam(team: Team): Promise<StorageResult>
  getTeam(teamId: string): Promise<Team | null>
  deleteTeam(teamId: string): Promise<StorageResult>
  listUserTeams(userId: string): Promise<Team[]>
  getTeamKey(teamId: string): string

  // Team collection operations (shared collections)
  saveTeamCollection(teamId: string, collection: Collection): Promise<StorageResult>
  getTeamCollection(teamId: string, collectionId: string): Promise<Collection | null>
  deleteTeamCollection(teamId: string, collectionId: string): Promise<StorageResult>
  listTeamCollections(teamId: string): Promise<Collection[]>
  getTeamCollectionKey(teamId: string, collectionId: string): string

  // Team environment operations (shared environments)
  saveTeamEnvironment(teamId: string, environment: Environment): Promise<StorageResult>
  getTeamEnvironment(teamId: string, environmentId: string): Promise<Environment | null>
  deleteTeamEnvironment(teamId: string, environmentId: string): Promise<StorageResult>
  listTeamEnvironments(teamId: string): Promise<Environment[]>
  getTeamEnvironmentKey(teamId: string, environmentId: string): string
}

class S3StorageClient implements StorageClient {
  private client: S3Client
  private bucket: string

  constructor(config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO and other S3-compatible services
    })
    this.bucket = config.bucket
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
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: JSON.stringify(data),
          ContentType: 'application/json',
        })
      )
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
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
      const body = await response.Body?.transformToString()
      if (!body) return null
      return JSON.parse(body) as T
    } catch {
      return null
    }
  }

  // Generic delete method
  private async deleteObject(key: string): Promise<StorageResult> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
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
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        })
      )
      return response.Contents?.map((obj) => obj.Key || '').filter(Boolean) || []
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
        await this.client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
          })
        )
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

export function createStorageClient(config: StorageConfig): StorageClient {
  return new S3StorageClient(config)
}
