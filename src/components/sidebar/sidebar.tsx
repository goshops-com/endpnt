'use client'

import { useState } from 'react'
import { Plus, FolderOpen, ChevronRight, ChevronDown, MoreHorizontal, Trash2, Edit2, Download, Upload, FileCode, Share2 } from 'lucide-react'
import { HistoryPanel } from '@/components/history/history-panel'
import { downloadCollection, parseImportedFile } from '@/lib/import-export'
import { ImportCurlDialog } from '@/components/dialogs/import-curl-dialog'
import { ShareCollectionDialog } from '@/components/dialogs/share-collection-dialog'
import type { ApiRequest as ApiRequestType, Folder } from '@/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCollections, useStore } from '@/store/store-context'
import { cn } from '@/lib/utils'
import type { ApiRequest, Collection } from '@/types'

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-500',
  POST: 'text-yellow-500',
  PUT: 'text-blue-500',
  PATCH: 'text-purple-500',
  DELETE: 'text-red-500',
  HEAD: 'text-gray-500',
  OPTIONS: 'text-cyan-500',
}

interface FolderItemProps {
  folder: Folder
  onRequestSelect: (request: ApiRequest) => void
  activeRequestId: string | null
  depth?: number
}

function FolderItem({ folder, onRequestSelect, activeRequestId, depth = 0 }: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="mb-0.5">
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer hover:bg-accent"
        style={{ marginLeft: `${depth * 8}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate text-sm text-muted-foreground">{folder.name}</span>
      </div>

      {isExpanded && (
        <div className="ml-2">
          {folder.requests.map((request) => (
            <div
              key={request.id}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent text-sm',
                activeRequestId === request.id && 'bg-accent'
              )}
              style={{ marginLeft: `${(depth + 1) * 8}px` }}
              onClick={() => onRequestSelect(request)}
            >
              <span className={cn('text-xs font-mono font-semibold w-12', METHOD_COLORS[request.method])}>
                {request.method}
              </span>
              <span className="truncate flex-1">{request.name || 'Untitled Request'}</span>
            </div>
          ))}
          {folder.folders.map((subfolder) => (
            <FolderItem
              key={subfolder.id}
              folder={subfolder}
              onRequestSelect={onRequestSelect}
              activeRequestId={activeRequestId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface CollectionItemProps {
  collection: Collection
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onEdit: () => void
  onAddRequest: () => void
  onExport: () => void
  onRequestSelect: (request: ApiRequest) => void
  activeRequestId: string | null
}

function CollectionItem({
  collection,
  isActive,
  onSelect,
  onDelete,
  onEdit,
  onAddRequest,
  onExport,
  onRequestSelect,
  activeRequestId,
}: CollectionItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="mb-1">
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent group',
          isActive && 'bg-accent'
        )}
        onClick={() => {
          onSelect()
          setIsExpanded(!isExpanded)
        }}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate text-sm">{collection.name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddRequest}>
              <Plus className="mr-2 h-4 w-4" />
              Add Request
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuItem>
            <ShareCollectionDialog
              collection={collection}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share with Team
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && (collection.requests.length > 0 || collection.folders.length > 0) && (
        <div className="ml-4 mt-1 space-y-0.5">
          {collection.folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              onRequestSelect={onRequestSelect}
              activeRequestId={activeRequestId}
            />
          ))}
          {collection.requests.map((request) => (
            <div
              key={request.id}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent text-sm',
                activeRequestId === request.id && 'bg-accent'
              )}
              onClick={() => onRequestSelect(request)}
            >
              <span className={cn('text-xs font-mono font-semibold w-12', METHOD_COLORS[request.method])}>
                {request.method}
              </span>
              <span className="truncate flex-1">{request.name || 'Untitled Request'}</span>
            </div>
          ))}
        </div>
      )}

      {isExpanded && collection.requests.length === 0 && collection.folders.length === 0 && (
        <div className="ml-6 px-2 py-2 text-sm text-muted-foreground italic">
          No requests yet
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const {
    collections,
    activeCollectionId,
    createCollection,
    deleteCollection,
    setActiveCollection,
    updateCollection,
  } = useCollections()
  const { createRequest, setActiveRequest, state, store } = useStore()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      createCollection(newCollectionName.trim(), newCollectionDescription.trim() || undefined)
      setNewCollectionName('')
      setNewCollectionDescription('')
      setIsCreateDialogOpen(false)
    }
  }

  const handleEditCollection = () => {
    if (editingCollection && newCollectionName.trim()) {
      updateCollection(editingCollection.id, {
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim() || undefined,
      })
      setEditingCollection(null)
      setNewCollectionName('')
      setNewCollectionDescription('')
      setIsEditDialogOpen(false)
    }
  }

  const handleAddRequest = (collectionId: string) => {
    const request = createRequest(collectionId, 'New Request', 'GET')
    setActiveRequest(request)
    setActiveCollection(collectionId)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const imported = parseImportedFile(content)
        store.addCollection(imported)
        setActiveCollection(imported.id)
      } catch (error) {
        alert('Failed to import collection: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset input
  }

  const handleImportCurl = (request: ApiRequestType, collectionId?: string) => {
    if (collectionId) {
      // Add to existing collection
      store.addRequestToCollection(collectionId, request)
      setActiveRequest(request)
      setActiveCollection(collectionId)
    } else {
      // Create a new collection for the imported request
      const newCollection = createCollection('Imported Requests')
      store.addRequestToCollection(newCollection.id, request)
      setActiveRequest(request)
    }
  }

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Header */}
      <div className="p-3 border-b bg-background">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Collections</h2>
          <div className="flex gap-1">
            <ImportCurlDialog
              onImport={handleImportCurl}
              collections={collections}
              trigger={
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Import from cURL">
                  <FileCode className="h-4 w-4" />
                </Button>
              }
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 relative" asChild title="Import Collection">
              <label>
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept=".json"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleImport}
                />
              </label>
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsCreateDialogOpen(true)} title="New Collection">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        {collections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No collections yet</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Create your first collection
            </Button>
          </div>
        ) : (
          collections.map((collection) => (
            <CollectionItem
              key={collection.id}
              collection={collection}
              isActive={activeCollectionId === collection.id}
              onSelect={() => setActiveCollection(collection.id)}
              onDelete={() => deleteCollection(collection.id)}
              onEdit={() => {
                setEditingCollection(collection)
                setNewCollectionName(collection.name)
                setNewCollectionDescription(collection.description || '')
                setIsEditDialogOpen(true)
              }}
              onAddRequest={() => handleAddRequest(collection.id)}
              onExport={() => downloadCollection(collection, 'postman')}
              onRequestSelect={(request) => {
                setActiveRequest(request)
                setActiveCollection(collection.id)
              }}
              activeRequestId={state.activeRequest?.id ?? null}
            />
          ))
        )}
      </ScrollArea>

      <div className="p-2 border-t space-y-1">
        <HistoryPanel />
      </div>

      {/* Create Collection Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Create a new collection to organize your API requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="My Collection"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Description of this collection..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCollection}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="My Collection"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Description of this collection..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCollection}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
