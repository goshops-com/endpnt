import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage, type R2Bucket } from '@/lib/storage'
import type { Environment } from '@/types'

// Runtime is 'nodejs' for local dev with S3/MinIO AWS SDK XML parsing
// Cloudflare Pages will override this to edge runtime via @cloudflare/next-on-pages

// Dynamic import for Cloudflare runtime
async function getR2Bucket(): Promise<R2Bucket | undefined> {
  if (process.env.NODE_ENV !== 'production') {
    return undefined
  }
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages')
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

// GET /api/environments - List user's environments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - provide auth or device ID' }, { status: 401 })
    }

    const storage = getStorage(await getR2Bucket())
    const environments = await storage.listEnvironments(userId)

    return NextResponse.json({ environments })
  } catch (error) {
    console.error('Failed to list environments:', error)
    return NextResponse.json(
      { error: 'Failed to list environments' },
      { status: 500 }
    )
  }
}

// POST /api/environments - Create or update an environment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - provide auth or device ID' }, { status: 401 })
    }

    const body = await request.json()
    const { environment } = body as { environment: Environment }

    if (!environment) {
      return NextResponse.json({ error: 'Environment is required' }, { status: 400 })
    }

    const storage = getStorage(await getR2Bucket())
    await storage.saveEnvironment(userId, environment)

    return NextResponse.json({ success: true, environment })
  } catch (error) {
    console.error('Failed to save environment:', error)
    return NextResponse.json(
      { error: 'Failed to save environment' },
      { status: 500 }
    )
  }
}

// PUT /api/environments - Bulk save environments
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - provide auth or device ID' }, { status: 401 })
    }

    const body = await request.json()
    const { environments } = body as { environments: Environment[] }

    if (!environments || !Array.isArray(environments)) {
      return NextResponse.json({ error: 'Environments array is required' }, { status: 400 })
    }

    const storage = getStorage(await getR2Bucket())

    // Save all environments
    await Promise.all(
      environments.map(environment => storage.saveEnvironment(userId, environment))
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save environments:', error)
    return NextResponse.json(
      { error: 'Failed to save environments' },
      { status: 500 }
    )
  }
}
