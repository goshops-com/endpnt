import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage } from '@/lib/storage'
import type { Collection } from '@/types'

export const runtime = 'edge'

// GET /api/teams/[teamId]/collections - List team collections
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

    const collections = await storage.listTeamCollections(teamId)

    return NextResponse.json({ collections })
  } catch (error) {
    console.error('Failed to list team collections:', error)
    return NextResponse.json(
      { error: 'Failed to list collections' },
      { status: 500 }
    )
  }
}

// POST /api/teams/[teamId]/collections - Share a collection with the team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { userId } = await auth()
    const { teamId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage()
    const team = await storage.getTeam(teamId)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user is a member with write access
    const member = team.members.find(m => m.userId === userId)
    if (!member || member.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { collection } = body as { collection: Collection }

    if (!collection) {
      return NextResponse.json({ error: 'Collection is required' }, { status: 400 })
    }

    // Save collection to team
    await storage.saveTeamCollection(teamId, collection)

    // Update team's shared collections list
    if (!team.sharedCollections.includes(collection.id)) {
      team.sharedCollections.push(collection.id)
      team.updatedAt = new Date().toISOString()
      await storage.saveTeam(team)
    }

    return NextResponse.json({ success: true, collection })
  } catch (error) {
    console.error('Failed to share collection:', error)
    return NextResponse.json(
      { error: 'Failed to share collection' },
      { status: 500 }
    )
  }
}
