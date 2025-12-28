import type { ApiRequest, KeyValue, HttpMethod } from '@/types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Parse a cURL command into an ApiRequest object
 */
export function parseCurl(curlCommand: string): ApiRequest {
  const now = new Date().toISOString()
  const request: ApiRequest = {
    id: uuidv4(),
    name: 'Imported Request',
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: { type: 'none' },
    createdAt: now,
    updatedAt: now,
  }

  // Normalize the command - handle line continuations and multiple spaces
  let normalized = curlCommand
    .replace(/\\\n/g, ' ')
    .replace(/\\\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove 'curl' prefix
  if (normalized.toLowerCase().startsWith('curl ')) {
    normalized = normalized.slice(5).trim()
  }

  // Tokenize respecting quotes
  const tokens = tokenize(normalized)

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]

    // Method
    if (token === '-X' || token === '--request') {
      i++
      if (i < tokens.length) {
        request.method = tokens[i].toUpperCase() as HttpMethod
      }
    }
    // Headers
    else if (token === '-H' || token === '--header') {
      i++
      if (i < tokens.length) {
        const header = parseHeader(tokens[i])
        if (header) {
          request.headers.push(header)
        }
      }
    }
    // Data/Body
    else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
      i++
      if (i < tokens.length) {
        const bodyContent = tokens[i]
        request.body = {
          type: isJson(bodyContent) ? 'json' : 'raw',
          content: bodyContent,
        }
        // If no method specified and we have data, default to POST
        if (request.method === 'GET') {
          request.method = 'POST'
        }
      }
    }
    // Form data
    else if (token === '-F' || token === '--form') {
      i++
      if (i < tokens.length) {
        if (!request.body || !request.body.formData) {
          request.body = { type: 'form-data', formData: [] }
        }
        const formField = parseFormField(tokens[i])
        if (formField && request.body.formData) {
          request.body.formData.push(formField)
        }
        if (request.method === 'GET') {
          request.method = 'POST'
        }
      }
    }
    // URL-encoded form data
    else if (token === '--data-urlencode') {
      i++
      if (i < tokens.length) {
        if (!request.body || request.body.type !== 'x-www-form-urlencoded') {
          request.body = { type: 'x-www-form-urlencoded', formData: [] }
        }
        const formField = parseFormField(tokens[i])
        if (formField && request.body.formData) {
          request.body.formData.push(formField)
        }
        if (request.method === 'GET') {
          request.method = 'POST'
        }
      }
    }
    // User agent
    else if (token === '-A' || token === '--user-agent') {
      i++
      if (i < tokens.length) {
        request.headers.push({
          id: uuidv4(),
          key: 'User-Agent',
          value: tokens[i],
          enabled: true,
        })
      }
    }
    // Basic auth
    else if (token === '-u' || token === '--user') {
      i++
      if (i < tokens.length) {
        const auth = tokens[i]
        const encoded = btoa(auth)
        request.headers.push({
          id: uuidv4(),
          key: 'Authorization',
          value: `Basic ${encoded}`,
          enabled: true,
        })
      }
    }
    // Cookie
    else if (token === '-b' || token === '--cookie') {
      i++
      if (i < tokens.length) {
        request.headers.push({
          id: uuidv4(),
          key: 'Cookie',
          value: tokens[i],
          enabled: true,
        })
      }
    }
    // Compressed
    else if (token === '--compressed') {
      // Check if Accept-Encoding already exists
      const hasAcceptEncoding = request.headers.some(h => h.key.toLowerCase() === 'accept-encoding')
      if (!hasAcceptEncoding) {
        request.headers.push({
          id: uuidv4(),
          key: 'Accept-Encoding',
          value: 'gzip, deflate, br',
          enabled: true,
        })
      }
    }
    // URL (anything that looks like a URL or doesn't start with -)
    else if (!token.startsWith('-') || token.match(/^https?:\/\//)) {
      // Clean up quotes if present
      const cleanUrl = token.replace(/^['"]|['"]$/g, '')
      if (cleanUrl.match(/^https?:\/\//) || cleanUrl.includes('.') || cleanUrl.startsWith('localhost')) {
        request.url = cleanUrl
        // Parse query params from URL
        try {
          const url = new URL(cleanUrl.startsWith('http') ? cleanUrl : `http://${cleanUrl}`)
          request.url = `${url.origin}${url.pathname}`
          url.searchParams.forEach((value, key) => {
            request.params.push({
              id: uuidv4(),
              key,
              value,
              enabled: true,
            })
          })
        } catch {
          request.url = cleanUrl
        }
      }
    }
    // Skip other flags
    else if (token.startsWith('-')) {
      // Check if next token is a value for this flag
      const flagsWithValues = ['-o', '--output', '-L', '--location', '-k', '--insecure', '-v', '--verbose', '-s', '--silent']
      if (!flagsWithValues.includes(token) && i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
        i++ // Skip the value
      }
    }

    i++
  }

  // Set name from URL
  if (request.url) {
    try {
      const url = new URL(request.url.startsWith('http') ? request.url : `http://${request.url}`)
      request.name = `${request.method} ${url.pathname || '/'}`
    } catch {
      request.name = `${request.method} Request`
    }
  }

  return request
}

/**
 * Tokenize a string respecting quotes
 */
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuote: string | null = null
  let escape = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (escape) {
      current += char
      escape = false
      continue
    }

    if (char === '\\') {
      escape = true
      continue
    }

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null
        // Don't add the closing quote
      } else {
        current += char
      }
    } else {
      if (char === '"' || char === "'") {
        inQuote = char
        // Don't add the opening quote
      } else if (char === ' ' || char === '\t') {
        if (current) {
          tokens.push(current)
          current = ''
        }
      } else {
        current += char
      }
    }
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

/**
 * Parse a header string like "Content-Type: application/json"
 */
function parseHeader(headerStr: string): KeyValue | null {
  const colonIndex = headerStr.indexOf(':')
  if (colonIndex === -1) return null

  const key = headerStr.slice(0, colonIndex).trim()
  const value = headerStr.slice(colonIndex + 1).trim()

  return {
    id: uuidv4(),
    key,
    value,
    enabled: true,
  }
}

/**
 * Parse a form field like "name=value" or "name=@file"
 */
function parseFormField(fieldStr: string): KeyValue | null {
  const eqIndex = fieldStr.indexOf('=')
  if (eqIndex === -1) return null

  const key = fieldStr.slice(0, eqIndex).trim()
  const value = fieldStr.slice(eqIndex + 1).trim()

  return {
    id: uuidv4(),
    key,
    value,
    enabled: true,
  }
}

/**
 * Check if a string looks like JSON
 */
function isJson(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}
