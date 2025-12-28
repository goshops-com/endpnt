'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Upload, AlertCircle, Plus } from 'lucide-react'
import { parseCurl } from '@/lib/curl-parser'
import type { ApiRequest, Collection } from '@/types'

interface ImportCurlDialogProps {
  onImport: (request: ApiRequest, collectionId?: string) => void
  collections?: Collection[]
  trigger?: React.ReactNode
}

export function ImportCurlDialog({ onImport, collections = [], trigger }: ImportCurlDialogProps) {
  const [open, setOpen] = useState(false)
  const [curlCommand, setCurlCommand] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<string>('__new__')
  const [error, setError] = useState<string | null>(null)

  const handleImport = () => {
    try {
      setError(null)
      const request = parseCurl(curlCommand)

      if (!request.url) {
        setError('Could not parse URL from cURL command')
        return
      }

      const collectionId = selectedCollection === '__new__' ? undefined : selectedCollection
      onImport(request, collectionId)
      setCurlCommand('')
      setSelectedCollection('__new__')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse cURL command')
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setCurlCommand(text)
      setError(null)
    } catch {
      setError('Failed to read clipboard')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import cURL
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from cURL</DialogTitle>
          <DialogDescription>
            Paste a cURL command to import it as a new request
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex-1 mr-4">
              <Label className="text-sm font-medium mb-1.5 block">Add to Collection</Label>
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Create new collection</span>
                    </div>
                  </SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-5">
              <Button variant="outline" size="sm" onClick={handlePaste}>
                Paste from Clipboard
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <Label className="text-sm font-medium mb-1.5 block">cURL Command</Label>
            <Textarea
              placeholder={`curl -X POST 'https://api.example.com/users' \\
  -H 'Content-Type: application/json' \\
  -d '{"name": "John"}'`}
              value={curlCommand}
              onChange={(e) => {
                setCurlCommand(e.target.value)
                setError(null)
              }}
              className="h-full min-h-[200px] max-h-[400px] font-mono text-sm resize-none overflow-auto"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm shrink-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!curlCommand.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
