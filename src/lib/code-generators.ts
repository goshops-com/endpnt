import type { ApiRequest } from '@/types'

export type CodeLanguage = 'curl' | 'fetch' | 'axios' | 'python' | 'go' | 'php' | 'ruby' | 'csharp' | 'java'

export interface CodeGeneratorOptions {
  indentSize?: number
  useSingleQuotes?: boolean
}

/**
 * Generate code snippet for a request
 */
export function generateCode(
  request: ApiRequest,
  language: CodeLanguage,
  options: CodeGeneratorOptions = {}
): string {
  const generators: Record<CodeLanguage, (req: ApiRequest, opts: CodeGeneratorOptions) => string> = {
    curl: generateCurl,
    fetch: generateFetch,
    axios: generateAxios,
    python: generatePython,
    go: generateGo,
    php: generatePhp,
    ruby: generateRuby,
    csharp: generateCSharp,
    java: generateJava,
  }

  return generators[language](request, options)
}

/**
 * Build full URL with query params
 */
function buildFullUrl(request: ApiRequest): string {
  if (!request.url) return ''

  const enabledParams = request.params.filter(p => p.enabled && p.key)
  if (enabledParams.length === 0) return request.url

  try {
    const url = new URL(request.url)
    enabledParams.forEach(p => {
      url.searchParams.set(p.key, p.value)
    })
    return url.toString()
  } catch {
    const queryString = enabledParams
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&')
    const separator = request.url.includes('?') ? '&' : '?'
    return `${request.url}${separator}${queryString}`
  }
}

/**
 * Get enabled headers
 */
function getEnabledHeaders(request: ApiRequest): Record<string, string> {
  const headers: Record<string, string> = {}
  request.headers
    .filter(h => h.enabled && h.key)
    .forEach(h => {
      headers[h.key] = h.value
    })

  // Add content-type for body
  if (request.body?.type === 'json' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  } else if (request.body?.type === 'x-www-form-urlencoded' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  return headers
}

/**
 * Get request body
 */
function getBody(request: ApiRequest): string | null {
  if (!request.body || request.body.type === 'none') return null

  if (request.body.type === 'json' || request.body.type === 'raw') {
    return request.body.content || null
  }

  if (request.body.type === 'x-www-form-urlencoded' && request.body.formData) {
    return request.body.formData
      .filter(f => f.enabled && f.key)
      .map(f => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
      .join('&')
  }

  if (request.body.type === 'form-data' && request.body.formData) {
    const obj: Record<string, string> = {}
    request.body.formData
      .filter(f => f.enabled && f.key)
      .forEach(f => {
        obj[f.key] = f.value
      })
    return JSON.stringify(obj)
  }

  return null
}

/**
 * Generate cURL command
 */
function generateCurl(request: ApiRequest): string {
  const parts: string[] = ['curl']
  const url = buildFullUrl(request)
  const headers = getEnabledHeaders(request)
  const body = getBody(request)

  // Method (skip for GET)
  if (request.method !== 'GET') {
    parts.push(`-X ${request.method}`)
  }

  // URL
  parts.push(`'${url}'`)

  // Headers
  Object.entries(headers).forEach(([key, value]) => {
    parts.push(`-H '${key}: ${value}'`)
  })

  // Body
  if (body) {
    // Escape single quotes in body
    const escapedBody = body.replace(/'/g, "'\\''")
    parts.push(`-d '${escapedBody}'`)
  }

  return parts.join(' \\\n  ')
}

/**
 * Generate JavaScript fetch code
 */
function generateFetch(request: ApiRequest, options: CodeGeneratorOptions = {}): string {
  const indent = ' '.repeat(options.indentSize || 2)
  const q = options.useSingleQuotes ? "'" : '"'
  const url = buildFullUrl(request)
  const headers = getEnabledHeaders(request)
  const body = getBody(request)

  const lines: string[] = []
  lines.push(`fetch(${q}${url}${q}, {`)
  lines.push(`${indent}method: ${q}${request.method}${q},`)

  if (Object.keys(headers).length > 0) {
    lines.push(`${indent}headers: {`)
    Object.entries(headers).forEach(([key, value], index, arr) => {
      const comma = index < arr.length - 1 ? ',' : ''
      lines.push(`${indent}${indent}${q}${key}${q}: ${q}${value}${q}${comma}`)
    })
    lines.push(`${indent}},`)
  }

  if (body) {
    if (request.body?.type === 'json') {
      lines.push(`${indent}body: JSON.stringify(${body}),`)
    } else {
      lines.push(`${indent}body: ${q}${body.replace(/"/g, '\\"')}${q},`)
    }
  }

  lines.push('})')
  lines.push(`${indent}.then(response => response.json())`)
  lines.push(`${indent}.then(data => console.log(data))`)
  lines.push(`${indent}.catch(error => console.error(${q}Error:${q}, error));`)

  return lines.join('\n')
}

/**
 * Generate Axios code
 */
function generateAxios(request: ApiRequest, options: CodeGeneratorOptions = {}): string {
  const indent = ' '.repeat(options.indentSize || 2)
  const q = options.useSingleQuotes ? "'" : '"'
  const url = buildFullUrl(request)
  const headers = getEnabledHeaders(request)
  const body = getBody(request)

  const lines: string[] = []
  lines.push(`axios({`)
  lines.push(`${indent}method: ${q}${request.method.toLowerCase()}${q},`)
  lines.push(`${indent}url: ${q}${url}${q},`)

  if (Object.keys(headers).length > 0) {
    lines.push(`${indent}headers: {`)
    Object.entries(headers).forEach(([key, value], index, arr) => {
      const comma = index < arr.length - 1 ? ',' : ''
      lines.push(`${indent}${indent}${q}${key}${q}: ${q}${value}${q}${comma}`)
    })
    lines.push(`${indent}},`)
  }

  if (body) {
    if (request.body?.type === 'json') {
      lines.push(`${indent}data: ${body},`)
    } else {
      lines.push(`${indent}data: ${q}${body}${q},`)
    }
  }

  lines.push('})')
  lines.push(`${indent}.then(response => console.log(response.data))`)
  lines.push(`${indent}.catch(error => console.error(error));`)

  return lines.join('\n')
}

/**
 * Generate Python requests code
 */
function generatePython(request: ApiRequest): string {
  const url = buildFullUrl(request)
  const headers = getEnabledHeaders(request)
  const body = getBody(request)

  const lines: string[] = []
  lines.push('import requests')
  lines.push('')

  if (Object.keys(headers).length > 0) {
    lines.push('headers = {')
    Object.entries(headers).forEach(([key, value]) => {
      lines.push(`    "${key}": "${value}",`)
    })
    lines.push('}')
    lines.push('')
  }

  if (body && request.body?.type === 'json') {
    lines.push(`payload = ${body}`)
    lines.push('')
  }

  let call = `response = requests.${request.method.toLowerCase()}("${url}"`
  if (Object.keys(headers).length > 0) {
    call += ', headers=headers'
  }
  if (body) {
    if (request.body?.type === 'json') {
      call += ', json=payload'
    } else {
      call += `, data="${body}"`
    }
  }
  call += ')'
  lines.push(call)
  lines.push('')
  lines.push('print(response.status_code)')
  lines.push('print(response.json())')

  return lines.join('\n')
}

/**
 * Generate Go code
 */
function generateGo(request: ApiRequest): string {
  const url = buildFullUrl(request)
  const headers = getEnabledHeaders(request)
  const body = getBody(request)

  const lines: string[] = []
  lines.push('package main')
  lines.push('')
  lines.push('import (')
  lines.push('    "fmt"')
  lines.push('    "io"')
  lines.push('    "net/http"')
  if (body) {
    lines.push('    "strings"')
  }
  lines.push(')')
  lines.push('')
  lines.push('func main() {')

  if (body) {
    lines.push(`    payload := strings.NewReader(\`${body}\`)`)
    lines.push(`    req, err := http.NewRequest("${request.method}", "${url}", payload)`)
  } else {
    lines.push(`    req, err := http.NewRequest("${request.method}", "${url}", nil)`)
  }

  lines.push('    if err != nil {')
  lines.push('        panic(err)')
  lines.push('    }')
  lines.push('')

  Object.entries(headers).forEach(([key, value]) => {
    lines.push(`    req.Header.Add("${key}", "${value}")`)
  })

  lines.push('')
  lines.push('    client := &http.Client{}')
  lines.push('    resp, err := client.Do(req)')
  lines.push('    if err != nil {')
  lines.push('        panic(err)')
  lines.push('    }')
  lines.push('    defer resp.Body.Close()')
  lines.push('')
  lines.push('    body, _ := io.ReadAll(resp.Body)')
  lines.push('    fmt.Println(string(body))')
  lines.push('}')

  return lines.join('\n')
}

/**
 * Generate PHP code
 */
function generatePhp(request: ApiRequest): string {
  const url = buildFullUrl(request)
  const headers = getEnabledHeaders(request)
  const body = getBody(request)

  const lines: string[] = []
  lines.push('<?php')
  lines.push('')
  lines.push('$curl = curl_init();')
  lines.push('')
  lines.push('curl_setopt_array($curl, [')
  lines.push(`    CURLOPT_URL => "${url}",`)
  lines.push('    CURLOPT_RETURNTRANSFER => true,')
  lines.push(`    CURLOPT_CUSTOMREQUEST => "${request.method}",`)

  if (Object.keys(headers).length > 0) {
    lines.push('    CURLOPT_HTTPHEADER => [')
    Object.entries(headers).forEach(([key, value]) => {
      lines.push(`        "${key}: ${value}",`)
    })
    lines.push('    ],')
  }

  if (body) {
    const escapedBody = body.replace(/"/g, '\\"')
    lines.push(`    CURLOPT_POSTFIELDS => "${escapedBody}",`)
  }

  lines.push(']);')
  lines.push('')
  lines.push('$response = curl_exec($curl);')
  lines.push('$err = curl_error($curl);')
  lines.push('')
  lines.push('curl_close($curl);')
  lines.push('')
  lines.push('if ($err) {')
  lines.push('    echo "Error: " . $err;')
  lines.push('} else {')
  lines.push('    echo $response;')
  lines.push('}')

  return lines.join('\n')
}

/**
 * Generate Ruby code
 */
function generateRuby(request: ApiRequest): string {
  const url = buildFullUrl(request)
  const headers = getEnabledHeaders(request)
  const body = getBody(request)

  const lines: string[] = []
  lines.push("require 'net/http'")
  lines.push("require 'uri'")
  lines.push("require 'json'")
  lines.push('')
  lines.push(`uri = URI.parse("${url}")`)
  lines.push('http = Net::HTTP.new(uri.host, uri.port)')
  lines.push("http.use_ssl = uri.scheme == 'https'")
  lines.push('')
  lines.push(`request = Net::HTTP::${capitalize(request.method.toLowerCase())}.new(uri.request_uri)`)

  Object.entries(headers).forEach(([key, value]) => {
    lines.push(`request["${key}"] = "${value}"`)
  })

  if (body) {
    lines.push(`request.body = '${body}'`)
  }

  lines.push('')
  lines.push('response = http.request(request)')
  lines.push('puts response.code')
  lines.push('puts response.body')

  return lines.join('\n')
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Generate C# code
 */
function generateCSharp(request: ApiRequest): string {
  const url = buildFullUrl(request)
  const headers = getEnabledHeaders(request)
  const body = getBody(request)

  const lines: string[] = []
  lines.push('using System;')
  lines.push('using System.Net.Http;')
  lines.push('using System.Threading.Tasks;')
  lines.push('')
  lines.push('class Program')
  lines.push('{')
  lines.push('    static async Task Main()')
  lines.push('    {')
  lines.push('        using var client = new HttpClient();')
  lines.push('')

  Object.entries(headers).forEach(([key, value]) => {
    if (key.toLowerCase() !== 'content-type') {
      lines.push(`        client.DefaultRequestHeaders.Add("${key}", "${value}");`)
    }
  })

  if (body) {
    const contentType = headers['Content-Type'] || 'text/plain'
    lines.push(`        var content = new StringContent(@"${body.replace(/"/g, '""')}", System.Text.Encoding.UTF8, "${contentType}");`)
    lines.push(`        var response = await client.${capitalize(request.method.toLowerCase())}Async("${url}", content);`)
  } else if (request.method === 'GET') {
    lines.push(`        var response = await client.GetAsync("${url}");`)
  } else {
    lines.push(`        var response = await client.${capitalize(request.method.toLowerCase())}Async("${url}", null);`)
  }

  lines.push('')
  lines.push('        Console.WriteLine(response.StatusCode);')
  lines.push('        Console.WriteLine(await response.Content.ReadAsStringAsync());')
  lines.push('    }')
  lines.push('}')

  return lines.join('\n')
}

/**
 * Generate Java code
 */
function generateJava(request: ApiRequest): string {
  const url = buildFullUrl(request)
  const headers = getEnabledHeaders(request)
  const body = getBody(request)

  const lines: string[] = []
  lines.push('import java.net.URI;')
  lines.push('import java.net.http.HttpClient;')
  lines.push('import java.net.http.HttpRequest;')
  lines.push('import java.net.http.HttpResponse;')
  lines.push('')
  lines.push('public class Main {')
  lines.push('    public static void main(String[] args) throws Exception {')
  lines.push('        HttpClient client = HttpClient.newHttpClient();')
  lines.push('')
  lines.push('        HttpRequest request = HttpRequest.newBuilder()')
  lines.push(`            .uri(URI.create("${url}"))`)

  Object.entries(headers).forEach(([key, value]) => {
    lines.push(`            .header("${key}", "${value}")`)
  })

  if (body) {
    lines.push(`            .method("${request.method}", HttpRequest.BodyPublishers.ofString("${body.replace(/"/g, '\\"')}"))`)
  } else {
    lines.push(`            .method("${request.method}", HttpRequest.BodyPublishers.noBody())`)
  }

  lines.push('            .build();')
  lines.push('')
  lines.push('        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());')
  lines.push('')
  lines.push('        System.out.println(response.statusCode());')
  lines.push('        System.out.println(response.body());')
  lines.push('    }')
  lines.push('}')

  return lines.join('\n')
}

export const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  curl: 'cURL',
  fetch: 'JavaScript (Fetch)',
  axios: 'JavaScript (Axios)',
  python: 'Python (Requests)',
  go: 'Go',
  php: 'PHP (cURL)',
  ruby: 'Ruby',
  csharp: 'C# (.NET)',
  java: 'Java (HttpClient)',
}
