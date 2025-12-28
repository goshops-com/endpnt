import { describe, it, expect } from 'vitest'
import { generateCode } from '../code-generators'
import type { ApiRequest } from '@/types'

const createRequest = (overrides: Partial<ApiRequest> = {}): ApiRequest => ({
  id: 'test-id',
  name: 'Test Request',
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: [],
  params: [],
  body: { type: 'none' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('generateCode', () => {
  describe('curl', () => {
    it('should generate a simple GET request', () => {
      const request = createRequest()
      const code = generateCode(request, 'curl')

      expect(code).toContain('curl')
      expect(code).toContain('https://api.example.com/users')
      expect(code).not.toContain('-X GET') // GET is default
    })

    it('should include method for non-GET requests', () => {
      const request = createRequest({ method: 'POST' })
      const code = generateCode(request, 'curl')

      expect(code).toContain('-X POST')
    })

    it('should include headers', () => {
      const request = createRequest({
        headers: [
          { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
          { id: '2', key: 'Authorization', value: 'Bearer token', enabled: true },
        ],
      })
      const code = generateCode(request, 'curl')

      expect(code).toContain("-H 'Content-Type: application/json'")
      expect(code).toContain("-H 'Authorization: Bearer token'")
    })

    it('should include query params in URL', () => {
      const request = createRequest({
        params: [
          { id: '1', key: 'page', value: '1', enabled: true },
          { id: '2', key: 'limit', value: '10', enabled: true },
        ],
      })
      const code = generateCode(request, 'curl')

      expect(code).toContain('page=1')
      expect(code).toContain('limit=10')
    })

    it('should include JSON body', () => {
      const request = createRequest({
        method: 'POST',
        body: { type: 'json', content: '{"name": "test"}' },
      })
      const code = generateCode(request, 'curl')

      expect(code).toContain("-d '{\"name\": \"test\"}'")
    })
  })

  describe('fetch', () => {
    it('should generate fetch code', () => {
      const request = createRequest()
      const code = generateCode(request, 'fetch')

      expect(code).toContain('fetch(')
      expect(code).toContain('https://api.example.com/users')
      expect(code).toContain('method:')
    })

    it('should include headers object', () => {
      const request = createRequest({
        headers: [
          { id: '1', key: 'Authorization', value: 'Bearer token', enabled: true },
        ],
      })
      const code = generateCode(request, 'fetch')

      expect(code).toContain('headers:')
      expect(code).toContain('Authorization')
      expect(code).toContain('Bearer token')
    })

    it('should use JSON.stringify for JSON body', () => {
      const request = createRequest({
        method: 'POST',
        body: { type: 'json', content: '{"name": "test"}' },
      })
      const code = generateCode(request, 'fetch')

      expect(code).toContain('JSON.stringify')
    })
  })

  describe('axios', () => {
    it('should generate axios code', () => {
      const request = createRequest()
      const code = generateCode(request, 'axios')

      expect(code).toContain('axios({')
      expect(code).toContain('method:')
      expect(code).toContain('url:')
    })
  })

  describe('python', () => {
    it('should generate Python requests code', () => {
      const request = createRequest()
      const code = generateCode(request, 'python')

      expect(code).toContain('import requests')
      expect(code).toContain('requests.get')
    })

    it('should use json parameter for JSON body', () => {
      const request = createRequest({
        method: 'POST',
        body: { type: 'json', content: '{"name": "test"}' },
      })
      const code = generateCode(request, 'python')

      expect(code).toContain('json=payload')
    })
  })

  describe('go', () => {
    it('should generate Go code', () => {
      const request = createRequest()
      const code = generateCode(request, 'go')

      expect(code).toContain('package main')
      expect(code).toContain('net/http')
      expect(code).toContain('http.NewRequest')
    })
  })

  describe('php', () => {
    it('should generate PHP cURL code', () => {
      const request = createRequest()
      const code = generateCode(request, 'php')

      expect(code).toContain('<?php')
      expect(code).toContain('curl_init')
      expect(code).toContain('CURLOPT_URL')
    })
  })

  describe('ruby', () => {
    it('should generate Ruby code', () => {
      const request = createRequest()
      const code = generateCode(request, 'ruby')

      expect(code).toContain("require 'net/http'")
      expect(code).toContain('URI.parse')
    })
  })

  describe('csharp', () => {
    it('should generate C# code', () => {
      const request = createRequest()
      const code = generateCode(request, 'csharp')

      expect(code).toContain('using System.Net.Http')
      expect(code).toContain('HttpClient')
    })
  })

  describe('java', () => {
    it('should generate Java code', () => {
      const request = createRequest()
      const code = generateCode(request, 'java')

      expect(code).toContain('import java.net.http.HttpClient')
      expect(code).toContain('HttpRequest.newBuilder')
    })
  })

  describe('disabled items', () => {
    it('should not include disabled headers', () => {
      const request = createRequest({
        headers: [
          { id: '1', key: 'Active', value: 'yes', enabled: true },
          { id: '2', key: 'Disabled', value: 'no', enabled: false },
        ],
      })
      const code = generateCode(request, 'curl')

      expect(code).toContain('Active')
      expect(code).not.toContain('Disabled')
    })

    it('should not include disabled params', () => {
      const request = createRequest({
        params: [
          { id: '1', key: 'active', value: 'yes', enabled: true },
          { id: '2', key: 'disabled', value: 'no', enabled: false },
        ],
      })
      const code = generateCode(request, 'curl')

      expect(code).toContain('active=yes')
      expect(code).not.toContain('disabled=no')
    })
  })
})
