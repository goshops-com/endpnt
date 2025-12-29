import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStorage } from '@/lib/storage'
import type { Environment } from '@/types'

export const runtime = 'edge'

// GET /api/environments - List user's environments
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = getStorage()
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
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { environment } = body as { environment: Environment }

    if (!environment) {
      return NextResponse.json({ error: 'Environment is required' }, { status: 400 })
    }

    const storage = getStorage()
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
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { environments } = body as { environments: Environment[] }

    if (!environments || !Array.isArray(environments)) {
      return NextResponse.json({ error: 'Environments array is required' }, { status: 400 })
    }

    const storage = getStorage()

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
