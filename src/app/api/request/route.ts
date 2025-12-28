import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export interface SendRequestBody {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

export interface SendRequestResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
  size: number
}

export async function POST(request: NextRequest) {
  try {
    const body: SendRequestBody = await request.json()
    const { method, url, headers, body: requestBody } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const startTime = Date.now()

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: {
        ...headers,
      },
    }

    // Add body for methods that support it
    if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = requestBody
    }

    // Make the request
    const response = await fetch(parsedUrl.toString(), fetchOptions)

    const endTime = Date.now()
    const time = endTime - startTime

    // Get response body
    const responseBody = await response.text()
    const size = new TextEncoder().encode(responseBody).length

    // Convert headers to plain object
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    const result: SendRequestResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      time,
      size,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Request error:', error)

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          error: 'Network error',
          message: 'Could not connect to the server. Please check the URL and try again.',
        },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        error: 'Request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
