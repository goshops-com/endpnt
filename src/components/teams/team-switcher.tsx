'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Users,
  ChevronDown,
  Plus,
  Settings,
  UserPlus,
  Check,
  Loader2,
  User,
} from 'lucide-react'
import type { Team } from '@/types'

interface TeamSwitcherProps {
  onTeamChange?: (teamId: string | null) => void
}

export function TeamSwitcher({ onTeamChange }: TeamSwitcherProps) {
  const { user, isLoaded } = useUser()
  const [teams, setTeams] = useState<Team[]>([])
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Form state
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')

  useEffect(() => {
    if (isLoaded && user) {
      fetchTeams()
    } else if (isLoaded && !user) {
      setLoading(false)
    }
  }, [isLoaded, user])

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams || [])
        // Set active team from localStorage or first team
        const savedTeamId = localStorage.getItem('activeTeamId')
        if (savedTeamId && data.teams?.some((t: Team) => t.id === savedTeamId)) {
          setActiveTeamId(savedTeamId)
        } else if (data.teams?.length > 0) {
          setActiveTeamId(data.teams[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setTeams([...teams, data.team])
        setActiveTeamId(data.team.id)
        localStorage.setItem('activeTeamId', data.team.id)
        onTeamChange?.(data.team.id)
        setNewTeamName('')
        setNewTeamDescription('')
        setIsCreateOpen(false)
      }
    } catch (error) {
      console.error('Failed to create team:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !activeTeamId) return

    setInviting(true)
    try {
      const res = await fetch(`/api/teams/${activeTeamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      if (res.ok) {
        setInviteEmail('')
        setIsInviteOpen(false)
        fetchTeams() // Refresh teams
      }
    } catch (error) {
      console.error('Failed to invite member:', error)
    } finally {
      setInviting(false)
    }
  }

  const handleSwitchTeam = (teamId: string | null) => {
    setActiveTeamId(teamId)
    if (teamId) {
      localStorage.setItem('activeTeamId', teamId)
    } else {
      localStorage.removeItem('activeTeamId')
    }
    onTeamChange?.(teamId)
  }

  const activeTeam = teams.find(t => t.id === activeTeamId)

  if (!isLoaded || loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {activeTeam ? (
              <>
                <Users className="h-4 w-4" />
                <span className="max-w-[120px] truncate">{activeTeam.name}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                <span>Personal</span>
              </>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[240px]">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Personal workspace */}
          <DropdownMenuItem onClick={() => handleSwitchTeam(null)}>
            <User className="h-4 w-4 mr-2" />
            <span>Personal</span>
            {!activeTeamId && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>

          {/* Team workspaces */}
          {teams.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Teams</DropdownMenuLabel>
              {teams.map(team => (
                <DropdownMenuItem key={team.id} onClick={() => handleSwitchTeam(team.id)}>
                  <Users className="h-4 w-4 mr-2" />
                  <span className="flex-1 truncate">{team.name}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {team.members.length}
                  </Badge>
                  {activeTeamId === team.id && <Check className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />

          {/* Team actions */}
          {activeTeam && (
            <>
              <DropdownMenuItem onClick={() => setIsInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsManageOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Team Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Team Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>
              Create a new team to collaborate with others on your API collections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="My Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description (optional)</Label>
              <Textarea
                id="team-description"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                placeholder="What is this team for?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={creating || !newTeamName.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Members Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to {activeTeam?.name}</DialogTitle>
            <DialogDescription>
              Invite someone to collaborate on this team's collections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-2">
                {(['admin', 'member', 'viewer'] as const).map(role => (
                  <Button
                    key={role}
                    variant={inviteRole === role ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInviteRole(role)}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {inviteRole === 'admin' && 'Can manage team settings and members'}
                {inviteRole === 'member' && 'Can create and edit collections'}
                {inviteRole === 'viewer' && 'Can only view collections'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={inviting || !inviteEmail.trim()}>
              {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Settings Dialog */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Team Settings</DialogTitle>
            <DialogDescription>
              Manage your team members and settings.
            </DialogDescription>
          </DialogHeader>
          {activeTeam && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">Members ({activeTeam.members.length})</Label>
                <ScrollArea className="h-[200px] mt-2 rounded-md border">
                  <div className="p-2 space-y-2">
                    {activeTeam.members.map(member => (
                      <div key={member.userId} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                        <div>
                          <p className="text-sm font-medium">{member.name || member.email || member.userId}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant="secondary">{member.role}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              {activeTeam.invitations.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Pending Invitations ({activeTeam.invitations.length})</Label>
                  <ScrollArea className="h-[100px] mt-2 rounded-md border">
                    <div className="p-2 space-y-2">
                      {activeTeam.invitations.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                          <p className="text-sm">{inv.email}</p>
                          <Badge variant="outline">{inv.role}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
