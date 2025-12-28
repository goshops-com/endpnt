import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage } from '@/lib/storage'
import type { TeamInvitation, TeamRole } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge'

// POST /api/teams/[teamId]/members - Invite a member
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

    // Check if user can invite (owner or admin)
    const member = team.members.find(m => m.userId === userId)
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role = 'member' } = body as { email: string; role?: TeamRole }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if already a member
    if (team.members.some(m => m.email === email)) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
    }

    // Check if already invited
    if (team.invitations.some(i => i.email === email)) {
      return NextResponse.json({ error: 'User is already invited' }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invitation: TeamInvitation = {
      id: uuidv4(),
      email,
      role,
      invitedBy: userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    team.invitations.push(invitation)
    team.updatedAt = now.toISOString()
    await storage.saveTeam(team)

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Failed to invite member:', error)
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[teamId]/members - Remove a member
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

    const storage = getStorage()
    const team = await storage.getTeam(teamId)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const body = await request.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    // Check permissions
    const currentMember = team.members.find(m => m.userId === userId)
    const targetMember = team.members.find(m => m.userId === memberId)

    if (!currentMember || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Can't remove the owner
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove team owner' }, { status: 400 })
    }

    // Only owner/admin can remove others, or self
    if (memberId !== userId && currentMember.role !== 'owner' && currentMember.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    team.members = team.members.filter(m => m.userId !== memberId)
    team.updatedAt = new Date().toISOString()
    await storage.saveTeam(team)

    // Remove team from member's profile
    const profile = await storage.getUserProfile(memberId)
    if (profile) {
      profile.teams = profile.teams.filter(t => t !== teamId)
      if (profile.activeTeamId === teamId) {
        profile.activeTeamId = undefined
      }
      await storage.saveUserProfile(profile)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
