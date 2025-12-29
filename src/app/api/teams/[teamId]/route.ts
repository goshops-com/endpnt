import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage, type R2Bucket } from '@/lib/storage'
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

// GET /api/teams/[teamId] - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { userId } = await auth()
    const { teamId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage(getR2Bucket())
    const team = await storage.getTeam(teamId)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user is a member
    const isMember = team.members.some(m => m.userId === userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Failed to get team:', error)
    return NextResponse.json(
      { error: 'Failed to get team' },
      { status: 500 }
    )
  }
}

// PATCH /api/teams/[teamId] - Update team
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { userId } = await auth()
    const { teamId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage(getR2Bucket())
    const team = await storage.getTeam(teamId)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user is owner or admin
    const member = team.members.find(m => m.userId === userId)
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body as { name?: string; description?: string }

    if (name) team.name = name
    if (description !== undefined) team.description = description
    team.updatedAt = new Date().toISOString()

    await storage.saveTeam(team)

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Failed to update team:', error)
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[teamId] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { userId } = await auth()
    const { teamId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage(getR2Bucket())
    const team = await storage.getTeam(teamId)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Only owner can delete
    const member = team.members.find(m => m.userId === userId)
    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove team from all members' profiles
    for (const teamMember of team.members) {
      const profile = await storage.getUserProfile(teamMember.userId)
      if (profile) {
        profile.teams = profile.teams.filter(t => t !== teamId)
        if (profile.activeTeamId === teamId) {
          profile.activeTeamId = undefined
        }
        await storage.saveUserProfile(profile)
      }
    }

    await storage.deleteTeam(teamId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete team:', error)
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    )
  }
}
