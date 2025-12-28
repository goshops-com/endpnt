import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage } from '@/lib/storage'
import type { Team, TeamMember, UserProfile } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge'

// GET /api/teams - List user's teams
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage()
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
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const storage = getStorage()
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
