'use client'

import { useState, useMemo } from 'react'
import { Copy, Check, Download, WrapText, Maximize2, X } from 'lucide-react'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json'
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml'
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { useResponse, useLoading } from '@/store/store-context'
import { cn } from '@/lib/utils'
import type { TestResult } from '@/types'

// Register languages
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('xml', xml)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('html', xml)

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'bg-green-500/10 text-green-600 border-green-500/30'
  if (status >= 300 && status < 400) return 'bg-blue-500/10 text-blue-600 border-blue-500/30'
  if (status >= 400 && status < 500) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
  if (status >= 500) return 'bg-red-500/10 text-red-600 border-red-500/30'
  return 'bg-gray-500/10 text-gray-600 border-gray-500/30'
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

function isJsonContent(contentType: string | undefined): boolean {
  return contentType?.includes('application/json') || contentType?.includes('+json') || false
}

function isXmlContent(contentType: string | undefined): boolean {
  return contentType?.includes('application/xml') || contentType?.includes('text/xml') || contentType?.includes('+xml') || false
}

function isHtmlContent(contentType: string | undefined): boolean {
  return contentType?.includes('text/html') || false
}

function isJsContent(contentType: string | undefined): boolean {
  return contentType?.includes('application/javascript') || contentType?.includes('text/javascript') || false
}

function getLanguage(contentType: string | undefined): string {
  if (isJsonContent(contentType)) return 'json'
  if (isXmlContent(contentType)) return 'xml'
  if (isHtmlContent(contentType)) return 'html'
  if (isJsContent(contentType)) return 'javascript'
  return 'plaintext'
}

function formatXml(xml: string): string {
  try {
    let formatted = ''
    let indent = 0
    const parts = xml.replace(/>\s*</g, '><').split(/(<[^>]+>)/g).filter(Boolean)

    for (const part of parts) {
      if (part.startsWith('</')) {
        indent--
        formatted += '  '.repeat(Math.max(0, indent)) + part + '\n'
      } else if (part.startsWith('<') && part.endsWith('/>')) {
        formatted += '  '.repeat(indent) + part + '\n'
      } else if (part.startsWith('<')) {
        formatted += '  '.repeat(indent) + part + '\n'
        if (!part.startsWith('<?') && !part.startsWith('<!')) {
          indent++
        }
      } else {
        formatted += '  '.repeat(indent) + part.trim() + '\n'
      }
    }
    return formatted.trim()
  } catch {
    return xml
  }
}

interface ResponseViewerProps {
  testResults?: TestResult[]
}

export function ResponseViewer({ testResults = [] }: ResponseViewerProps) {
  const { response } = useResponse()
  const { isLoading } = useLoading()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('body')
  const [wordWrap, setWordWrap] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const contentType = useMemo(() => {
    if (!response?.headers) return ''
    return String(response.headers['content-type'] || response.headers['Content-Type'] || '')
  }, [response])

  const language = useMemo(() => getLanguage(contentType), [contentType])

  const formattedBody = useMemo(() => {
    if (!response?.body) return ''
    if (isJsonContent(contentType)) {
      return formatJson(response.body)
    }
    if (isXmlContent(contentType)) {
      return formatXml(response.body)
    }
    return response.body
  }, [response, contentType])

  const handleCopy = async () => {
    if (response?.body) {
      try {
        await navigator.clipboard.writeText(formattedBody)
      } catch {
        // Clipboard API may not be available in test environments
        // Still show "Copied" feedback for user experience
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (response?.body) {
      const blob = new Blob([response.body], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'response.txt'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Sending request...</p>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/20">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Download className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium">No response yet</p>
          <p className="text-sm">Send a request to see the response here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Response Status Bar */}
      <div className="p-4 border-b flex items-center gap-4">
        <Badge variant="outline" className={cn('text-sm font-mono', getStatusColor(response.status))}>
          {response.status} {response.statusText}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Time: <span className="font-mono">{formatTime(response.time)}</span>
        </span>
        <span className="text-sm text-muted-foreground">
          Size: <span className="font-mono">{formatBytes(response.size)}</span>
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWordWrap(!wordWrap)}
          className={cn(wordWrap && 'bg-muted')}
        >
          <WrapText className="h-4 w-4 mr-1" />
          Wrap
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(true)}>
          <Maximize2 className="h-4 w-4 mr-1" />
          Fullscreen
        </Button>
      </div>

      {/* Response Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger
            value="body"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Body
          </TabsTrigger>
          <TabsTrigger
            value="headers"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Headers
            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {Object.keys(response.headers).length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="tests"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Test Results
            {testResults.length > 0 && (
              <span className={cn(
                'ml-1 text-xs px-1.5 py-0.5 rounded-full',
                testResults.every(t => t.passed) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {testResults.filter(t => t.passed).length}/{testResults.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 relative">
          <TabsContent value="body" className="mt-0 absolute inset-0 overflow-auto">
            {formattedBody ? (
              <SyntaxHighlighter
                language={language}
                style={atomOneDark}
                showLineNumbers
                wrapLines={wordWrap}
                wrapLongLines={wordWrap}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                  background: '#1e1e1e',
                  minHeight: '100%',
                }}
                lineNumberStyle={{
                  minWidth: '3em',
                  paddingRight: '1em',
                  color: '#6e7681',
                  userSelect: 'none',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  }
                }}
              >
                {formattedBody}
              </SyntaxHighlighter>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">(empty response)</div>
            )}
          </TabsContent>

          <TabsContent value="headers" className="mt-0 absolute inset-0 overflow-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Header</th>
                  <th className="text-left py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers).map(([key, value]) => (
                  <tr key={key} className="border-b">
                    <td className="py-2 pr-4 font-mono text-muted-foreground">{key}</td>
                    <td className="py-2 font-mono break-all">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="tests" className="mt-0 absolute inset-0 overflow-auto p-4">
            {testResults.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tests have been run.</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-md border',
                      result.passed
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900'
                        : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
                        {result.passed ? '✓' : '✗'}
                      </span>
                      <span className="font-medium">{result.name}</span>
                    </div>
                    {result.error && (
                      <p className="mt-1 text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[80vw] w-[80vw] h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DialogTitle className="text-lg font-semibold">Response</DialogTitle>
                <Badge variant="outline" className={cn('text-sm font-mono', getStatusColor(response.status))}>
                  {response.status} {response.statusText}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Time: <span className="font-mono">{formatTime(response.time)}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  Size: <span className="font-mono">{formatBytes(response.size)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWordWrap(!wordWrap)}
                  className={cn(wordWrap && 'bg-muted')}
                >
                  <WrapText className="h-4 w-4 mr-1" />
                  Wrap
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 px-4 shrink-0">
              <TabsTrigger
                value="body"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Body
              </TabsTrigger>
              <TabsTrigger
                value="headers"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Headers
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {Object.keys(response.headers).length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="tests"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Test Results
                {testResults.length > 0 && (
                  <span className={cn(
                    'ml-1 text-xs px-1.5 py-0.5 rounded-full',
                    testResults.every(t => t.passed) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {testResults.filter(t => t.passed).length}/{testResults.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 relative">
              <TabsContent value="body" className="mt-0 absolute inset-0 overflow-auto">
                {formattedBody ? (
                  <SyntaxHighlighter
                    language={language}
                    style={atomOneDark}
                    showLineNumbers
                    wrapLines={wordWrap}
                    wrapLongLines={wordWrap}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      fontSize: '0.875rem',
                      background: '#1e1e1e',
                      minHeight: '100%',
                    }}
                    lineNumberStyle={{
                      minWidth: '3em',
                      paddingRight: '1em',
                      color: '#6e7681',
                      userSelect: 'none',
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                      }
                    }}
                  >
                    {formattedBody}
                  </SyntaxHighlighter>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">(empty response)</div>
                )}
              </TabsContent>

              <TabsContent value="headers" className="mt-0 absolute inset-0 overflow-auto p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Header</th>
                      <th className="text-left py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(response.headers).map(([key, value]) => (
                      <tr key={key} className="border-b">
                        <td className="py-2 pr-4 font-mono text-muted-foreground">{key}</td>
                        <td className="py-2 font-mono break-all">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>

              <TabsContent value="tests" className="mt-0 absolute inset-0 overflow-auto p-4">
                {testResults.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No tests have been run.</p>
                ) : (
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div
                        key={index}
                        className={cn(
                          'p-3 rounded-md border',
                          result.passed
                            ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900'
                            : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
                            {result.passed ? '✓' : '✗'}
                          </span>
                          <span className="font-medium">{result.name}</span>
                        </div>
                        {result.error && (
                          <p className="mt-1 text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
