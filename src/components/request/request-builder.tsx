'use client'

import { useState } from 'react'
import { Send, Plus, Trash2, Loader2, Code, Upload, Copy, Check, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useActiveRequest, useLoading } from '@/store/store-context'
import { cn } from '@/lib/utils'
import type { KeyValue, BodyType, HttpMethod } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { CodeSnippetDialog } from '@/components/dialogs/code-snippet-dialog'
import { ImportCurlDialog } from '@/components/dialogs/import-curl-dialog'
import { generateCode } from '@/lib/code-generators'

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-600 border-green-500/30',
  POST: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  PUT: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  PATCH: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/30',
  HEAD: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
  OPTIONS: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
}

interface KeyValueEditorProps {
  items: KeyValue[]
  onChange: (items: KeyValue[]) => void
  placeholder?: { key: string; value: string }
}

function KeyValueEditor({ items, onChange, placeholder }: KeyValueEditorProps) {
  const addItem = () => {
    onChange([...items, { id: uuidv4(), key: '', value: '', enabled: true }])
  }

  const updateItem = (id: string, updates: Partial<KeyValue>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => updateItem(item.id, { enabled: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Input
            value={item.key}
            onChange={(e) => updateItem(item.id, { key: e.target.value })}
            placeholder={placeholder?.key || 'Key'}
            className="flex-1"
          />
          <Input
            value={item.value}
            onChange={(e) => updateItem(item.id, { value: e.target.value })}
            placeholder={placeholder?.value || 'Value'}
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add
      </Button>
    </div>
  )
}

interface BodyEditorProps {
  bodyType: BodyType
  content: string
  formData: KeyValue[]
  onTypeChange: (type: BodyType) => void
  onContentChange: (content: string) => void
  onFormDataChange: (formData: KeyValue[]) => void
}

function BodyEditor({
  bodyType,
  content,
  formData,
  onTypeChange,
  onContentChange,
  onFormDataChange,
}: BodyEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'] as BodyType[]).map((type) => (
          <Button
            key={type}
            variant={bodyType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeChange(type)}
          >
            {type === 'none' ? 'None' : type === 'json' ? 'JSON' : type === 'form-data' ? 'Form Data' : type === 'x-www-form-urlencoded' ? 'URL Encoded' : 'Raw'}
          </Button>
        ))}
      </div>

      {bodyType === 'none' && (
        <p className="text-sm text-muted-foreground">This request does not have a body.</p>
      )}

      {(bodyType === 'json' || bodyType === 'raw') && (
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Raw body content...'}
          className="min-h-[200px] font-mono text-sm"
        />
      )}

      {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
        <KeyValueEditor
          items={formData}
          onChange={onFormDataChange}
          placeholder={{ key: 'Field name', value: 'Field value' }}
        />
      )}
    </div>
  )
}

interface RequestBuilderProps {
  onSendRequest: () => void
  onImportCurl?: (request: import('@/types').ApiRequest) => void
}

export function RequestBuilder({ onSendRequest, onImportCurl }: RequestBuilderProps) {
  const { activeRequest, updateActiveRequest } = useActiveRequest()
  const { isLoading } = useLoading()
  const [activeTab, setActiveTab] = useState('params')
  const [copied, setCopied] = useState(false)

  const handleCopyCurl = async () => {
    if (!activeRequest) return
    try {
      const curl = generateCode(activeRequest, 'curl')
      await navigator.clipboard.writeText(curl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!activeRequest) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/30">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Send className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-lg font-medium">No request selected</p>
            <p className="text-sm">Select a request from the sidebar or create a new one</p>
          </div>
          {onImportCurl && (
            <ImportCurlDialog
              onImport={onImportCurl}
              trigger={
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import from cURL
                </Button>
              }
            />
          )}
        </div>
      </div>
    )
  }

  const bodyType = activeRequest.body?.type || 'none'
  const bodyContent = activeRequest.body?.content || ''
  const bodyFormData = activeRequest.body?.formData || []

  return (
    <div className="h-full flex flex-col">
      {/* Request Name */}
      <div className="p-4 border-b">
        <Input
          value={activeRequest.name}
          onChange={(e) => updateActiveRequest({ name: e.target.value })}
          placeholder="Request name"
          className="font-medium text-lg border-none shadow-none focus-visible:ring-0 px-0"
        />
      </div>

      {/* URL Bar */}
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Select
            value={activeRequest.method}
            onValueChange={(value) => updateActiveRequest({ method: value as HttpMethod })}
          >
            <SelectTrigger className={cn('w-[120px] font-mono font-semibold', METHOD_COLORS[activeRequest.method])}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((method) => (
                <SelectItem key={method} value={method} className="font-mono font-semibold">
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={activeRequest.url}
            onChange={(e) => updateActiveRequest({ url: e.target.value })}
            placeholder="Enter request URL"
            className="flex-1 font-mono"
          />

          <Button onClick={onSendRequest} disabled={isLoading || !activeRequest.url} className="px-6">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>

          <TooltipProvider>
            <div className="flex items-center border-l pl-2 ml-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleCopyCurl}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy as cURL</TooltipContent>
              </Tooltip>

              <CodeSnippetDialog
                request={activeRequest}
                trigger={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Code className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Generate Code</TooltipContent>
                  </Tooltip>
                }
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopyCurl}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy as cURL
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {onImportCurl && (
                    <ImportCurlDialog
                      onImport={onImportCurl}
                      trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Import from cURL
                        </DropdownMenuItem>
                      }
                    />
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Request Configuration Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger
              value="params"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Params
              {activeRequest.params.length > 0 && (
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {activeRequest.params.filter((p) => p.enabled).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="headers"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Headers
              {activeRequest.headers.length > 0 && (
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {activeRequest.headers.filter((h) => h.enabled).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="body"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Body
            </TabsTrigger>
            <TabsTrigger
              value="pre-request"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Pre-request Script
            </TabsTrigger>
            <TabsTrigger
              value="tests"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Tests
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-4">
            <TabsContent value="params" className="mt-0 h-full">
              <KeyValueEditor
                items={activeRequest.params}
                onChange={(params) => updateActiveRequest({ params })}
                placeholder={{ key: 'Parameter', value: 'Value' }}
              />
            </TabsContent>

            <TabsContent value="headers" className="mt-0 h-full">
              <KeyValueEditor
                items={activeRequest.headers}
                onChange={(headers) => updateActiveRequest({ headers })}
                placeholder={{ key: 'Header', value: 'Value' }}
              />
            </TabsContent>

            <TabsContent value="body" className="mt-0 h-full">
              <BodyEditor
                bodyType={bodyType}
                content={bodyContent}
                formData={bodyFormData}
                onTypeChange={(type) =>
                  updateActiveRequest({
                    body: { ...activeRequest.body, type, content: bodyContent, formData: bodyFormData },
                  })
                }
                onContentChange={(content) =>
                  updateActiveRequest({
                    body: { ...activeRequest.body, type: bodyType, content, formData: bodyFormData },
                  })
                }
                onFormDataChange={(formData) =>
                  updateActiveRequest({
                    body: { ...activeRequest.body, type: bodyType, content: bodyContent, formData },
                  })
                }
              />
            </TabsContent>

            <TabsContent value="pre-request" className="mt-0 h-full">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  JavaScript code to run before the request is sent.
                </p>
                <Textarea
                  value={activeRequest.preRequestScript?.content || ''}
                  onChange={(e) =>
                    updateActiveRequest({
                      preRequestScript: { enabled: true, content: e.target.value },
                    })
                  }
                  placeholder="// Pre-request script&#10;// pm.environment.set('token', 'value');"
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="tests" className="mt-0 h-full">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  JavaScript code to run after the response is received.
                </p>
                <Textarea
                  value={activeRequest.testScript?.content || ''}
                  onChange={(e) =>
                    updateActiveRequest({
                      testScript: { enabled: true, content: e.target.value },
                    })
                  }
                  placeholder="// Test script&#10;// pm.test('Status is 200', () => pm.response.status === 200);"
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
