import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage } from '@/lib/storage'

export const runtime = 'edge'

// GET /api/teams/[teamId]/collections/[collectionId] - Get a team collection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; collectionId: string }> }
) {
  try {
    const { userId } = await auth()
    const { teamId, collectionId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage()
    const team = await storage.getTeam(teamId)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user is a member
    const isMember = team.members.some(m => m.userId === userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const collection = await storage.getTeamCollection(teamId, collectionId)

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    return NextResponse.json({ collection })
  } catch (error) {
    console.error('Failed to get team collection:', error)
    return NextResponse.json(
      { error: 'Failed to get collection' },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[teamId]/collections/[collectionId] - Unshare a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; collectionId: string }> }
) {
  try {
    const { userId } = await auth()
    const { teamId, collectionId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage()
    const team = await storage.getTeam(teamId)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user is owner or admin
    const member = team.members.find(m => m.userId === userId)
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await storage.deleteTeamCollection(teamId, collectionId)

    // Update team's shared collections list
    team.sharedCollections = team.sharedCollections.filter(id => id !== collectionId)
    team.updatedAt = new Date().toISOString()
    await storage.saveTeam(team)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to unshare collection:', error)
    return NextResponse.json(
      { error: 'Failed to unshare collection' },
      { status: 500 }
    )
  }
}
