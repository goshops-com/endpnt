import { z } from 'zod'

// HTTP Methods
export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
export type HttpMethod = z.infer<typeof HttpMethodSchema>

// Key-Value pair for headers, params, etc.
export const KeyValueSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
})
export type KeyValue = z.infer<typeof KeyValueSchema>

// Request body types
export const BodyTypeSchema = z.enum(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw', 'binary'])
export type BodyType = z.infer<typeof BodyTypeSchema>

// Request body
export const RequestBodySchema = z.object({
  type: BodyTypeSchema,
  content: z.string().optional(),
  formData: z.array(KeyValueSchema).optional(),
})
export type RequestBody = z.infer<typeof RequestBodySchema>

// Script (pre-request or test)
export const ScriptSchema = z.object({
  enabled: z.boolean().default(true),
  content: z.string(),
})
export type Script = z.infer<typeof ScriptSchema>

// API Request
export const ApiRequestSchema = z.object({
  id: z.string(),
  name: z.string(),
  method: HttpMethodSchema,
  url: z.string(),
  headers: z.array(KeyValueSchema).default([]),
  params: z.array(KeyValueSchema).default([]),
  body: RequestBodySchema.optional(),
  preRequestScript: ScriptSchema.optional(),
  testScript: ScriptSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type ApiRequest = z.infer<typeof ApiRequestSchema>

// Folder within a collection
export const FolderSchema: z.ZodType<Folder> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    requests: z.array(ApiRequestSchema).default([]),
    folders: z.array(FolderSchema).default([]),
  })
)
export interface Folder {
  id: string
  name: string
  description?: string
  requests: ApiRequest[]
  folders: Folder[]
}

// Collection
export const CollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  requests: z.array(ApiRequestSchema).default([]),
  folders: z.array(FolderSchema).default([]),
  variables: z.array(KeyValueSchema).default([]),
  preRequestScript: ScriptSchema.optional(),
  testScript: ScriptSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Collection = z.infer<typeof CollectionSchema>

// Environment
export const EnvironmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  variables: z.array(KeyValueSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Environment = z.infer<typeof EnvironmentSchema>

// Response
export const ApiResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
  time: z.number(), // Response time in ms
  size: z.number(), // Response size in bytes
})
export type ApiResponse = z.infer<typeof ApiResponseSchema>

// History entry
export const HistoryEntrySchema = z.object({
  id: z.string(),
  request: ApiRequestSchema,
  response: ApiResponseSchema.optional(),
  timestamp: z.string(),
})
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>

// Workspace (contains all user data)
export const WorkspaceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  collections: z.array(z.string()).default([]), // Collection IDs
  environments: z.array(z.string()).default([]), // Environment IDs
  activeEnvironmentId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Workspace = z.infer<typeof WorkspaceSchema>

// Test result
export const TestResultSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  error: z.string().optional(),
})
export type TestResult = z.infer<typeof TestResultSchema>

// Team member role
export const TeamRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer'])
export type TeamRole = z.infer<typeof TeamRoleSchema>

// Team member
export const TeamMemberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().optional(),
  role: TeamRoleSchema,
  joinedAt: z.string(),
})
export type TeamMember = z.infer<typeof TeamMemberSchema>

// Team invitation
export const TeamInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: TeamRoleSchema,
  invitedBy: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
})
export type TeamInvitation = z.infer<typeof TeamInvitationSchema>

// Team
export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  members: z.array(TeamMemberSchema).default([]),
  invitations: z.array(TeamInvitationSchema).default([]),
  sharedCollections: z.array(z.string()).default([]), // Collection IDs shared with team
  sharedEnvironments: z.array(z.string()).default([]), // Environment IDs shared with team
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Team = z.infer<typeof TeamSchema>

// User profile (stored separately)
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  personalWorkspaceId: z.string(),
  teams: z.array(z.string()).default([]), // Team IDs user belongs to
  activeTeamId: z.string().optional(), // Currently selected team
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type UserProfile = z.infer<typeof UserProfileSchema>
