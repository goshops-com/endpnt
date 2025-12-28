'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Code, Copy, Check } from 'lucide-react'
import { generateCode, LANGUAGE_LABELS, type CodeLanguage } from '@/lib/code-generators'
import type { ApiRequest } from '@/types'

interface CodeSnippetDialogProps {
  request: ApiRequest | null
  trigger?: React.ReactNode
}

export function CodeSnippetDialog({ request, trigger }: CodeSnippetDialogProps) {
  const [open, setOpen] = useState(false)
  const [language, setLanguage] = useState<CodeLanguage>('curl')
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState('')

  useEffect(() => {
    if (request && open) {
      setCode(generateCode(request, language))
    }
  }, [request, language, open])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Code className="h-4 w-4 mr-2" />
            Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Code Snippet</DialogTitle>
          <DialogDescription>
            Generate code for this request in various languages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Select value={language} onValueChange={(v) => setLanguage(v as CodeLanguage)}>
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LANGUAGE_LABELS) as CodeLanguage[]).map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="h-[400px] rounded-md border bg-muted/50">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all">
              {code}
            </pre>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
