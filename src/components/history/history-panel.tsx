'use client'

import { useState } from 'react'
import { Clock, Trash2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useHistory, useStore } from '@/store/store-context'
import { cn } from '@/lib/utils'
import type { HistoryEntry } from '@/types'

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-600 border-green-500/30',
  POST: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  PUT: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  PATCH: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/30',
  HEAD: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
  OPTIONS: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'text-green-600'
  if (status >= 300 && status < 400) return 'text-blue-600'
  if (status >= 400 && status < 500) return 'text-yellow-600'
  if (status >= 500) return 'text-red-600'
  return 'text-gray-600'
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Less than 1 minute
  if (diff < 60000) return 'Just now'

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `${mins} min${mins > 1 ? 's' : ''} ago`
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  // More than 24 hours
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function extractUrlPath(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname + parsed.search
  } catch {
    return url
  }
}

interface HistoryItemProps {
  entry: HistoryEntry
  onSelect: () => void
}

function HistoryItem({ entry, onSelect }: HistoryItemProps) {
  return (
    <div
      className="p-3 border-b hover:bg-accent cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge
          variant="outline"
          className={cn('text-xs font-mono', METHOD_COLORS[entry.request.method])}
        >
          {entry.request.method}
        </Badge>
        {entry.response && (
          <span className={cn('text-xs font-mono', getStatusColor(entry.response.status))}>
            {entry.response.status}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {formatTime(entry.timestamp)}
        </span>
      </div>
      <div className="text-sm font-mono truncate text-muted-foreground">
        {extractUrlPath(entry.request.url)}
      </div>
      {entry.request.name && entry.request.name !== 'New Request' && (
        <div className="text-xs text-muted-foreground mt-1">
          {entry.request.name}
        </div>
      )}
    </div>
  )
}

export function HistoryPanel() {
  const { history, clearHistory } = useHistory()
  const { setActiveRequest, setResponse } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHistory = history.filter((entry) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      entry.request.url.toLowerCase().includes(query) ||
      entry.request.name.toLowerCase().includes(query) ||
      entry.request.method.toLowerCase().includes(query)
    )
  })

  const handleSelectEntry = (entry: HistoryEntry) => {
    // Load the request into the request builder
    setActiveRequest({ ...entry.request })
    // Also load the response if available
    if (entry.response) {
      setResponse(entry.response)
    }
    setIsOpen(false)
  }

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      clearHistory()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="w-full justify-start" size="sm">
          <Clock className="mr-2 h-4 w-4" />
          History
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {history.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Request History</SheetTitle>
          <SheetDescription>
            Your recent API requests. Click to load a request.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 border-b">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="pl-8"
              />
              {searchQuery && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearHistory}
              disabled={history.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]">
          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? (
                <p>No requests match your search</p>
              ) : (
                <>
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No request history yet</p>
                  <p className="text-sm">Send a request to see it here</p>
                </>
              )}
            </div>
          ) : (
            filteredHistory.map((entry) => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                onSelect={() => handleSelectEntry(entry)}
              />
            ))
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
