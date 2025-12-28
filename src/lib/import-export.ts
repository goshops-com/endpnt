import type { Collection, ApiRequest, KeyValue, Folder } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// Postman Collection v2.1 format types
interface PostmanCollection {
  info: {
    name: string
    description?: string
    schema: string
  }
  item: PostmanItem[]
  variable?: PostmanVariable[]
}

interface PostmanEvent {
  listen: 'test' | 'prerequest'
  script: {
    exec: string[]
    type?: string
  }
}

interface PostmanItem {
  name: string
  description?: string
  request?: PostmanRequest
  item?: PostmanItem[]
  event?: PostmanEvent[]
}

interface PostmanRequest {
  method: string
  header?: PostmanHeader[]
  body?: PostmanBody
  url: PostmanUrl | string
}

interface PostmanHeader {
  key: string
  value: string
  disabled?: boolean
  description?: string
}

interface PostmanBody {
  mode: 'raw' | 'formdata' | 'urlencoded' | 'file' | 'graphql'
  raw?: string
  formdata?: PostmanFormData[]
  urlencoded?: PostmanFormData[]
  options?: {
    raw?: {
      language?: string
    }
  }
}

interface PostmanFormData {
  key: string
  value: string
  disabled?: boolean
  description?: string
}

interface PostmanUrl {
  raw?: string
  protocol?: string
  host?: string[]
  path?: string[]
  query?: PostmanQuery[]
}

interface PostmanQuery {
  key: string
  value: string
  disabled?: boolean
  description?: string
}

interface PostmanVariable {
  key: string
  value: string
  disabled?: boolean
}

// Export collection to Postman format
export function exportToPostman(collection: Collection): PostmanCollection {
  const convertRequest = (request: ApiRequest): PostmanRequest => {
    const headers: PostmanHeader[] = request.headers.map((h) => ({
      key: h.key,
      value: h.value,
      disabled: !h.enabled,
      description: h.description,
    }))

    const query: PostmanQuery[] = request.params.map((p) => ({
      key: p.key,
      value: p.value,
      disabled: !p.enabled,
      description: p.description,
    }))

    let body: PostmanBody | undefined
    if (request.body && request.body.type !== 'none') {
      if (request.body.type === 'json') {
        body = {
          mode: 'raw',
          raw: request.body.content || '',
          options: { raw: { language: 'json' } },
        }
      } else if (request.body.type === 'raw') {
        body = {
          mode: 'raw',
          raw: request.body.content || '',
        }
      } else if (request.body.type === 'form-data') {
        body = {
          mode: 'formdata',
          formdata: (request.body.formData || []).map((f) => ({
            key: f.key,
            value: f.value,
            disabled: !f.enabled,
          })),
        }
      } else if (request.body.type === 'x-www-form-urlencoded') {
        body = {
          mode: 'urlencoded',
          urlencoded: (request.body.formData || []).map((f) => ({
            key: f.key,
            value: f.value,
            disabled: !f.enabled,
          })),
        }
      }
    }

    return {
      method: request.method,
      header: headers,
      body,
      url: {
        raw: request.url,
        query,
      },
    }
  }

  const convertFolder = (folder: Folder): PostmanItem => ({
    name: folder.name,
    description: folder.description,
    item: [
      ...folder.requests.map((r) => ({
        name: r.name,
        request: convertRequest(r),
      })),
      ...folder.folders.map(convertFolder),
    ],
  })

  return {
    info: {
      name: collection.name,
      description: collection.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      ...collection.requests.map((r) => ({
        name: r.name,
        request: convertRequest(r),
      })),
      ...collection.folders.map(convertFolder),
    ],
    variable: collection.variables.map((v) => ({
      key: v.key,
      value: v.value,
      disabled: !v.enabled,
    })),
  }
}

// Import collection from Postman format
export function importFromPostman(postmanCollection: PostmanCollection): Collection {
  const now = new Date().toISOString()

  const convertHeaders = (headers?: PostmanHeader[]): KeyValue[] => {
    if (!headers) return []
    return headers.map((h) => ({
      id: uuidv4(),
      key: h.key,
      value: h.value,
      enabled: !h.disabled,
      description: h.description,
    }))
  }

  const convertParams = (url: PostmanUrl | string | undefined): { url: string; params: KeyValue[] } => {
    if (!url) return { url: '', params: [] }

    if (typeof url === 'string') {
      return { url, params: [] }
    }

    const params: KeyValue[] = (url.query || []).map((q) => ({
      id: uuidv4(),
      key: q.key,
      value: q.value,
      enabled: !q.disabled,
      description: q.description,
    }))

    return { url: url.raw || '', params }
  }

  const convertBody = (body?: PostmanBody): ApiRequest['body'] => {
    if (!body) return { type: 'none' }

    if (body.mode === 'raw') {
      const isJson = body.options?.raw?.language === 'json'
      return {
        type: isJson ? 'json' : 'raw',
        content: body.raw || '',
      }
    }

    if (body.mode === 'formdata') {
      return {
        type: 'form-data',
        formData: (body.formdata || []).map((f) => ({
          id: uuidv4(),
          key: f.key,
          value: f.value,
          enabled: !f.disabled,
        })),
      }
    }

    if (body.mode === 'urlencoded') {
      return {
        type: 'x-www-form-urlencoded',
        formData: (body.urlencoded || []).map((f) => ({
          id: uuidv4(),
          key: f.key,
          value: f.value,
          enabled: !f.disabled,
        })),
      }
    }

    return { type: 'none' }
  }

  const convertScripts = (events?: PostmanEvent[]): { testScript?: ApiRequest['testScript']; preRequestScript?: ApiRequest['preRequestScript'] } => {
    if (!events) return {}

    const result: { testScript?: ApiRequest['testScript']; preRequestScript?: ApiRequest['preRequestScript'] } = {}

    for (const event of events) {
      const scriptContent = event.script?.exec?.join('\n') || ''
      if (!scriptContent.trim()) continue

      if (event.listen === 'test') {
        result.testScript = {
          enabled: true,
          content: scriptContent,
        }
      } else if (event.listen === 'prerequest') {
        result.preRequestScript = {
          enabled: true,
          content: scriptContent,
        }
      }
    }

    return result
  }

  const convertRequest = (item: PostmanItem): ApiRequest | null => {
    if (!item.request) return null

    const { url, params } = convertParams(item.request.url)
    const scripts = convertScripts(item.event)

    return {
      id: uuidv4(),
      name: item.name,
      method: (item.request.method || 'GET') as ApiRequest['method'],
      url,
      headers: convertHeaders(item.request.header),
      params,
      body: convertBody(item.request.body),
      testScript: scripts.testScript,
      preRequestScript: scripts.preRequestScript,
      createdAt: now,
      updatedAt: now,
    }
  }

  const convertFolder = (item: PostmanItem): Folder | null => {
    if (item.request) return null // It's a request, not a folder

    const requests: ApiRequest[] = []
    const folders: Folder[] = []

    for (const child of item.item || []) {
      if (child.request) {
        const req = convertRequest(child)
        if (req) requests.push(req)
      } else {
        const folder = convertFolder(child)
        if (folder) folders.push(folder)
      }
    }

    return {
      id: uuidv4(),
      name: item.name,
      description: item.description,
      requests,
      folders,
    }
  }

  const requests: ApiRequest[] = []
  const folders: Folder[] = []

  for (const item of postmanCollection.item || []) {
    if (item.request) {
      const req = convertRequest(item)
      if (req) requests.push(req)
    } else {
      const folder = convertFolder(item)
      if (folder) folders.push(folder)
    }
  }

  return {
    id: uuidv4(),
    name: postmanCollection.info.name,
    description: postmanCollection.info.description,
    requests,
    folders,
    variables: (postmanCollection.variable || []).map((v) => ({
      id: uuidv4(),
      key: v.key,
      value: v.value,
      enabled: !v.disabled,
    })),
    createdAt: now,
    updatedAt: now,
  }
}

// Download collection as JSON file
export function downloadCollection(collection: Collection, format: 'native' | 'postman' = 'native') {
  let data: string
  let filename: string

  if (format === 'postman') {
    data = JSON.stringify(exportToPostman(collection), null, 2)
    filename = `${collection.name.replace(/\s+/g, '_')}_postman.json`
  } else {
    data = JSON.stringify(collection, null, 2)
    filename = `${collection.name.replace(/\s+/g, '_')}.json`
  }

  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Parse imported file
export function parseImportedFile(content: string): Collection {
  const parsed = JSON.parse(content)

  // Check if it's a Postman collection
  if (parsed.info?.schema?.includes('getpostman.com')) {
    return importFromPostman(parsed as PostmanCollection)
  }

  // Check if it's our native format
  if (parsed.id && parsed.requests !== undefined) {
    return parsed as Collection
  }

  throw new Error('Unrecognized collection format')
}
