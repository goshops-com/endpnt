'use client'

import { useState, useCallback } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { Sidebar } from '@/components/sidebar/sidebar'
import { RequestBuilder } from '@/components/request/request-builder'
import { ResponseViewer } from '@/components/response/response-viewer'
import { EnvironmentManager } from '@/components/environments/environment-manager'
import { TeamSwitcher } from '@/components/teams/team-switcher'
import { Button } from '@/components/ui/button'
import { useActiveRequest, useResponse, useLoading, useHistory, useEnvironments } from '@/store/store-context'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun } from 'lucide-react'
import type { ApiResponse, ApiRequest, KeyValue, TestResult } from '@/types'
import { v4 as uuidv4 } from 'uuid'

function buildUrl(baseUrl: string, params: KeyValue[]): string {
  if (!baseUrl) return ''

  try {
    const url = new URL(baseUrl)
    params
      .filter((p) => p.enabled && p.key)
      .forEach((p) => {
        url.searchParams.set(p.key, p.value)
      })
    return url.toString()
  } catch {
    // If URL is invalid, just return the base
    const enabledParams = params.filter((p) => p.enabled && p.key)
    if (enabledParams.length === 0) return baseUrl

    const queryString = enabledParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&')

    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}${queryString}`
  }
}

function buildHeaders(headers: KeyValue[], bodyType?: string): Record<string, string> {
  const result: Record<string, string> = {}

  headers
    .filter((h) => h.enabled && h.key)
    .forEach((h) => {
      result[h.key] = h.value
    })

  // Add Content-Type for body types
  if (bodyType === 'json' && !result['Content-Type']) {
    result['Content-Type'] = 'application/json'
  } else if (bodyType === 'x-www-form-urlencoded' && !result['Content-Type']) {
    result['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  return result
}

function buildBody(request: { body?: { type: string; content?: string; formData?: KeyValue[] } }): string | undefined {
  if (!request.body || request.body.type === 'none') return undefined

  if (request.body.type === 'json' || request.body.type === 'raw') {
    return request.body.content
  }

  if (request.body.type === 'x-www-form-urlencoded' && request.body.formData) {
    return request.body.formData
      .filter((f) => f.enabled && f.key)
      .map((f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
      .join('&')
  }

  if (request.body.type === 'form-data' && request.body.formData) {
    // For form-data, we'd need to use FormData but since we're proxying through JSON API,
    // we'll convert to JSON for now
    const formObj: Record<string, string> = {}
    request.body.formData
      .filter((f) => f.enabled && f.key)
      .forEach((f) => {
        formObj[f.key] = f.value
      })
    return JSON.stringify(formObj)
  }

  return undefined
}

function replaceVariables(text: string, variables: KeyValue[]): string {
  let result = text
  variables
    .filter((v) => v.enabled)
    .forEach((v) => {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g')
      result = result.replace(regex, v.value)
    })
  return result
}

export function MainLayout() {
  const { activeRequest, setActiveRequest } = useActiveRequest()
  const { setResponse, clearResponse } = useResponse()
  const { setLoading } = useLoading()
  const { addToHistory } = useHistory()
  const { activeEnvironment, activeEnvironmentId, updateEnvironment } = useEnvironments()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [testResults, setTestResults] = useState<TestResult[]>([])

  const handleImportCurl = useCallback((request: ApiRequest) => {
    setActiveRequest(request)
  }, [setActiveRequest])

  const handleSendRequest = useCallback(async () => {
    if (!activeRequest || !activeRequest.url) return

    setLoading(true)
    clearResponse()
    setTestResults([])

    try {
      // Get variables from environment
      const variables = activeEnvironment?.variables || []

      // Build the request with variable substitution
      const url = replaceVariables(
        buildUrl(activeRequest.url, activeRequest.params),
        variables
      )

      const headers = buildHeaders(activeRequest.headers, activeRequest.body?.type)
      // Also replace variables in headers
      Object.keys(headers).forEach((key) => {
        headers[key] = replaceVariables(headers[key], variables)
      })

      let body = buildBody(activeRequest)
      if (body) {
        body = replaceVariables(body, variables)
      }

      // Send request through our proxy API
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: activeRequest.method,
          url,
          headers,
          body,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const apiResponse: ApiResponse = {
          status: data.status,
          statusText: data.statusText,
          headers: data.headers,
          body: data.body,
          time: data.time,
          size: data.size,
        }

        setResponse(apiResponse)

        // Run test script if present
        if (activeRequest.testScript?.enabled && activeRequest.testScript.content) {
          const scriptContext: ScriptContext = {
            variables: activeEnvironment?.variables || [],
            onSetVariable: (key: string, value: string) => {
              if (!activeEnvironmentId || !activeEnvironment) {
                console.warn('No active environment to set variable:', key)
                return
              }
              // Update or add the variable in the active environment
              const existingVars = activeEnvironment.variables || []
              const existingIndex = existingVars.findIndex((v) => v.key === key)
              let newVars: KeyValue[]
              if (existingIndex >= 0) {
                // Update existing variable
                newVars = existingVars.map((v, i) =>
                  i === existingIndex ? { ...v, value, enabled: true } : v
                )
              } else {
                // Add new variable
                newVars = [...existingVars, { id: uuidv4(), key, value, enabled: true }]
              }
              updateEnvironment(activeEnvironmentId, { variables: newVars })
            },
          }
          const results = runTestScript(activeRequest.testScript.content, apiResponse, scriptContext)
          setTestResults(results)
        }

        // Add to history
        addToHistory({
          id: uuidv4(),
          request: activeRequest,
          response: apiResponse,
          timestamp: new Date().toISOString(),
        })
      } else {
        // Handle proxy error
        setResponse({
          status: data.status || 0,
          statusText: data.error || 'Error',
          headers: {},
          body: JSON.stringify(data, null, 2),
          time: 0,
          size: 0,
        })
      }
    } catch (error) {
      console.error('Request failed:', error)
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: error instanceof Error ? error.message : 'Unknown error occurred',
        time: 0,
        size: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [activeRequest, activeEnvironment, setLoading, clearResponse, setResponse, addToHistory])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 border-b flex items-center px-4 shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <h1 className="text-lg font-semibold">Endpnt</h1>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <SignedIn>
            <TeamSwitcher />
          </SignedIn>
          <EnvironmentManager />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8"
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <div className="h-6 w-px bg-border" />
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign Up</Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize="20%" minSize="15%" maxSize="40%">
            <Sidebar />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Main Area */}
          <ResizablePanel defaultSize="80%">
            <ResizablePanelGroup orientation="vertical">
              {/* Request Builder */}
              <ResizablePanel defaultSize="50%" minSize="30%">
                <RequestBuilder onSendRequest={handleSendRequest} onImportCurl={handleImportCurl} />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Response Viewer */}
              <ResizablePanel defaultSize="50%" minSize="20%">
                <ResponseViewer testResults={testResults} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

interface ScriptContext {
  variables: KeyValue[]
  onSetVariable: (key: string, value: string) => void
}

// Simple test script runner
function runTestScript(script: string, response: ApiResponse, context: ScriptContext): TestResult[] {
  const results: TestResult[] = []

  // Create a simple pm-like API
  const pm = {
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body,
      json: () => {
        try {
          return JSON.parse(response.body)
        } catch {
          return null
        }
      },
    },
    environment: {
      get: (key: string): string | undefined => {
        const variable = context.variables.find((v) => v.key === key && v.enabled)
        return variable?.value
      },
      set: (key: string, value: string) => {
        context.onSetVariable(key, String(value))
      },
    },
    test: (name: string, fn: () => boolean | void) => {
      try {
        const result = fn()
        results.push({
          name,
          passed: result !== false,
        })
      } catch (error) {
        results.push({
          name,
          passed: false,
          error: error instanceof Error ? error.message : 'Test failed',
        })
      }
    },
    expect: (value: unknown) => ({
      to: {
        equal: (expected: unknown) => {
          if (value !== expected) {
            throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`)
          }
          return true
        },
        be: {
          true: () => {
            if (value !== true) throw new Error(`Expected true but got ${value}`)
            return true
          },
          false: () => {
            if (value !== false) throw new Error(`Expected false but got ${value}`)
            return true
          },
          null: () => {
            if (value !== null) throw new Error(`Expected null but got ${value}`)
            return true
          },
          undefined: () => {
            if (value !== undefined) throw new Error(`Expected undefined but got ${value}`)
            return true
          },
          above: (n: number) => {
            if (typeof value !== 'number' || value <= n)
              throw new Error(`Expected ${value} to be above ${n}`)
            return true
          },
          below: (n: number) => {
            if (typeof value !== 'number' || value >= n)
              throw new Error(`Expected ${value} to be below ${n}`)
            return true
          },
        },
        include: (substring: string) => {
          if (typeof value !== 'string' || !value.includes(substring)) {
            throw new Error(`Expected "${value}" to include "${substring}"`)
          }
          return true
        },
        have: {
          property: (prop: string) => {
            if (typeof value !== 'object' || value === null || !(prop in value)) {
              throw new Error(`Expected object to have property "${prop}"`)
            }
            return true
          },
          length: (len: number) => {
            if (!Array.isArray(value) || value.length !== len) {
              throw new Error(`Expected array length ${len} but got ${Array.isArray(value) ? value.length : 'non-array'}`)
            }
            return true
          },
        },
      },
    }),
  }

  try {
    // Run the script in a sandboxed way
    const fn = new Function('pm', script)
    fn(pm)
  } catch (error) {
    results.push({
      name: 'Script Execution',
      passed: false,
      error: error instanceof Error ? error.message : 'Script failed to execute',
    })
  }

  return results
}
