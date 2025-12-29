import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage, type R2Bucket } from '@/lib/storage'
import type { Collection } from '@/types'
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
  // Try Clerk auth first
  const { userId } = await auth()
  if (userId) return userId

  // Fall back to device ID from header
  const deviceId = request.headers.get('x-device-id')
  return deviceId || null
}

// GET /api/collections - List user's collections
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - provide auth or device ID' }, { status: 401 })
    }

    const storage = getStorage(getR2Bucket())
    const collections = await storage.listCollections(userId)

    return NextResponse.json({ collections })
  } catch (error) {
    console.error('Failed to list collections:', error)
    return NextResponse.json(
      { error: 'Failed to list collections' },
      { status: 500 }
    )
  }
}

// POST /api/collections - Create or update a collection
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - provide auth or device ID' }, { status: 401 })
    }

    const body = await request.json()
    const { collection } = body as { collection: Collection }

    if (!collection) {
      return NextResponse.json({ error: 'Collection is required' }, { status: 400 })
    }

    const storage = getStorage(getR2Bucket())
    await storage.saveCollection(userId, collection)

    return NextResponse.json({ success: true, collection })
  } catch (error) {
    console.error('Failed to save collection:', error)
    return NextResponse.json(
      { error: 'Failed to save collection' },
      { status: 500 }
    )
  }
}

// PUT /api/collections - Bulk save collections
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - provide auth or device ID' }, { status: 401 })
    }

    const body = await request.json()
    const { collections } = body as { collections: Collection[] }

    if (!collections || !Array.isArray(collections)) {
      return NextResponse.json({ error: 'Collections array is required' }, { status: 400 })
    }

    const storage = getStorage(getR2Bucket())

    // Save all collections
    await Promise.all(
      collections.map(collection => storage.saveCollection(userId, collection))
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save collections:', error)
    return NextResponse.json(
      { error: 'Failed to save collections' },
      { status: 500 }
    )
  }
}
