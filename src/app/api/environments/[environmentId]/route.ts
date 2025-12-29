import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage, type R2Bucket } from '@/lib/storage'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// Get R2 bucket from Cloudflare context
function getR2Bucket(): R2Bucket | undefined {
  try {
    const { env } = getRequestContext()
    return (env as { R2_BUCKET?: R2Bucket }).R2_BUCKET
  } catch {
    return undefined
  }
}

// Get user ID from Clerk auth or device ID header
async function getUserId(request: NextRequest): Promise<string | null> {
  const { userId } = await auth()
  if (userId) return userId
  return request.headers.get('x-device-id')
}

// DELETE /api/environments/[environmentId] - Delete an environment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ environmentId: string }> }
) {
  try {
    const userId = await getUserId(request)
    const { environmentId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage(getR2Bucket())
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
