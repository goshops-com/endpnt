'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Share2, Users, Loader2, Check } from 'lucide-react'
import type { Collection, Team } from '@/types'

interface ShareCollectionDialogProps {
  collection: Collection
  trigger?: React.ReactNode
  onShare?: () => void
}

export function ShareCollectionDialog({ collection, trigger, onShare }: ShareCollectionDialogProps) {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState<string | null>(null)
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && user) {
      fetchTeams()
    }
  }, [open, user])

  const fetchTeams = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json() as { teams: Team[] }
        setTeams(data.teams || [])

        // Check which teams already have this collection
        const shared = new Set<string>()
        for (const team of data.teams || []) {
          if (team.sharedCollections?.includes(collection.id)) {
            shared.add(team.id)
          }
        }
        setSharedWith(shared)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async (teamId: string) => {
    setSharing(teamId)
    try {
      const res = await fetch(`/api/teams/${teamId}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection }),
      })

      if (res.ok) {
        setSharedWith(prev => new Set([...prev, teamId]))
        onShare?.()
      }
    } catch (error) {
      console.error('Failed to share collection:', error)
    } finally {
      setSharing(null)
    }
  }

  const handleUnshare = async (teamId: string) => {
    setSharing(teamId)
    try {
      const res = await fetch(`/api/teams/${teamId}/collections/${collection.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setSharedWith(prev => {
          const next = new Set(prev)
          next.delete(teamId)
          return next
        })
        onShare?.()
      }
    } catch (error) {
      console.error('Failed to unshare collection:', error)
    } finally {
      setSharing(null)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Collection</DialogTitle>
          <DialogDescription>
            Share "{collection.name}" with your teams
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">You don't have any teams yet.</p>
              <p className="text-xs mt-1">Create a team to share collections.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select teams to share with</Label>
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-2 space-y-1">
                  {teams.map(team => {
                    const isShared = sharedWith.has(team.id)
                    const isProcessing = sharing === team.id

                    return (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-3 rounded-md hover:bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{team.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={isShared ? 'secondary' : 'outline'}
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => isShared ? handleUnshare(team.id) : handleShare(team.id)}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isShared ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Shared
                            </>
                          ) : (
                            'Share'
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {sharedWith.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Share2 className="h-4 w-4" />
            Shared with {sharedWith.size} team{sharedWith.size !== 1 ? 's' : ''}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
