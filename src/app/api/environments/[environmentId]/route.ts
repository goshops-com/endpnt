import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage } from '@/lib/storage'

export const runtime = 'edge'

// DELETE /api/environments/[environmentId] - Delete an environment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ environmentId: string }> }
) {
  try {
    const { userId } = await auth()
    const { environmentId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage()
    await storage.deleteEnvironment(userId, environmentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete environment:', error)
    return NextResponse.json(
      { error: 'Failed to delete environment' },
      { status: 500 }
    )
  }
}
