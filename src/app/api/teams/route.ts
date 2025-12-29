import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage, type R2Bucket } from '@/lib/storage'
import type { Team, TeamMember, UserProfile } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getR2Bucket(): R2Bucket | undefined {
  try {
    const { env } = getRequestContext()
    return (env as { R2_BUCKET?: R2Bucket }).R2_BUCKET
  } catch {
    return undefined
  }
}

// GET /api/teams - List user's teams
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage(getR2Bucket())
    const teams = await storage.listUserTeams(userId)

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Failed to list teams:', error)
    return NextResponse.json(
      { error: 'Failed to list teams' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body as { name: string; description?: string }

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const storage = getStorage(getR2Bucket())
    const now = new Date().toISOString()

    // Create the team
    const teamId = uuidv4()
    const member: TeamMember = {
      userId,
      email: '', // Will be filled from user data
      role: 'owner',
      joinedAt: now,
    }

    const team: Team = {
      id: teamId,
      name,
      description,
      members: [member],
      invitations: [],
      sharedCollections: [],
      sharedEnvironments: [],
      createdAt: now,
      updatedAt: now,
    }

    await storage.saveTeam(team)

    // Update user profile to include this team
    let profile = await storage.getUserProfile(userId)
    if (!profile) {
      profile = {
        id: userId,
        email: '',
        personalWorkspaceId: uuidv4(),
        teams: [teamId],
        activeTeamId: teamId,
        createdAt: now,
        updatedAt: now,
      }
    } else {
      profile.teams.push(teamId)
      profile.updatedAt = now
    }
    await storage.saveUserProfile(profile)

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Failed to create team:', error)
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    )
  }
}
