import { describe, it, expect } from 'vitest'
import { parseCurl } from '../curl-parser'

describe('parseCurl', () => {
  it('should parse a simple GET request', () => {
    const result = parseCurl('curl https://api.example.com/users')
    expect(result.method).toBe('GET')
    expect(result.url).toBe('https://api.example.com/users')
  })

  it('should parse a POST request with method flag', () => {
    const result = parseCurl('curl -X POST https://api.example.com/users')
    expect(result.method).toBe('POST')
    expect(result.url).toBe('https://api.example.com/users')
  })

  it('should parse headers', () => {
    const result = parseCurl(`curl https://api.example.com \\
      -H 'Content-Type: application/json' \\
      -H 'Authorization: Bearer token123'`)

    expect(result.headers).toHaveLength(2)
    expect(result.headers[0].key).toBe('Content-Type')
    expect(result.headers[0].value).toBe('application/json')
    expect(result.headers[1].key).toBe('Authorization')
    expect(result.headers[1].value).toBe('Bearer token123')
  })

  it('should parse JSON body with -d flag', () => {
    const result = parseCurl(`curl -X POST https://api.example.com/users \\
      -H 'Content-Type: application/json' \\
      -d '{"name": "John", "email": "john@example.com"}'`)

    expect(result.method).toBe('POST')
    expect(result.body?.type).toBe('json')
    expect(result.body?.content).toBe('{"name": "John", "email": "john@example.com"}')
  })

  it('should default to POST when body is present', () => {
    const result = parseCurl(`curl https://api.example.com \\
      -d '{"name": "John"}'`)

    expect(result.method).toBe('POST')
  })

  it('should parse URL with query parameters', () => {
    const result = parseCurl('curl "https://api.example.com/search?q=test&page=1"')

    expect(result.url).toBe('https://api.example.com/search')
    expect(result.params).toHaveLength(2)
    expect(result.params[0].key).toBe('q')
    expect(result.params[0].value).toBe('test')
    expect(result.params[1].key).toBe('page')
    expect(result.params[1].value).toBe('1')
  })

  it('should parse basic auth', () => {
    const result = parseCurl('curl -u username:password https://api.example.com')

    const authHeader = result.headers.find(h => h.key === 'Authorization')
    expect(authHeader).toBeDefined()
    expect(authHeader?.value).toContain('Basic')
  })

  it('should parse cookie header', () => {
    const result = parseCurl('curl -b "session=abc123" https://api.example.com')

    const cookieHeader = result.headers.find(h => h.key === 'Cookie')
    expect(cookieHeader).toBeDefined()
    expect(cookieHeader?.value).toBe('session=abc123')
  })

  it('should parse user agent', () => {
    const result = parseCurl('curl -A "Mozilla/5.0" https://api.example.com')

    const uaHeader = result.headers.find(h => h.key === 'User-Agent')
    expect(uaHeader).toBeDefined()
    expect(uaHeader?.value).toBe('Mozilla/5.0')
  })

  it('should handle line continuations', () => {
    const result = parseCurl(`curl \\
      -X POST \\
      -H 'Content-Type: application/json' \\
      -d '{"name": "test"}' \\
      https://api.example.com/users`)

    expect(result.method).toBe('POST')
    expect(result.url).toBe('https://api.example.com/users')
    expect(result.body?.content).toBe('{"name": "test"}')
  })

  it('should handle form data with -F flag', () => {
    const result = parseCurl(`curl -X POST https://api.example.com/upload \\
      -F 'file=@photo.jpg' \\
      -F 'description=My photo'`)

    expect(result.body?.type).toBe('form-data')
    expect(result.body?.formData).toHaveLength(2)
  })

  it('should handle URL encoded form data', () => {
    const result = parseCurl(`curl https://api.example.com/login \\
      --data-urlencode 'username=john' \\
      --data-urlencode 'password=secret'`)

    expect(result.body?.type).toBe('x-www-form-urlencoded')
    expect(result.body?.formData).toHaveLength(2)
  })

  it('should parse --compressed flag', () => {
    const result = parseCurl('curl --compressed https://api.example.com')

    const acceptEncoding = result.headers.find(h => h.key === 'Accept-Encoding')
    expect(acceptEncoding).toBeDefined()
    expect(acceptEncoding?.value).toContain('gzip')
  })

  it('should set name based on URL path', () => {
    const result = parseCurl('curl -X DELETE https://api.example.com/users/123')
    expect(result.name).toBe('DELETE /users/123')
  })

  it('should handle double quotes in URL', () => {
    const result = parseCurl('curl "https://api.example.com/users"')
    expect(result.url).toBe('https://api.example.com/users')
  })

  it('should handle single quotes in URL', () => {
    const result = parseCurl("curl 'https://api.example.com/users'")
    expect(result.url).toBe('https://api.example.com/users')
  })

  it('should handle complex real-world example', () => {
    const result = parseCurl(`curl 'https://api.stripe.com/v1/charges' \\
      -u sk_test_xxx: \\
      -H 'Content-Type: application/x-www-form-urlencoded' \\
      -d 'amount=2000' \\
      -d 'currency=usd' \\
      -d 'source=tok_visa'`)

    expect(result.method).toBe('POST')
    expect(result.url).toBe('https://api.stripe.com/v1/charges')
    expect(result.headers.some(h => h.key === 'Authorization')).toBe(true)
  })
})
