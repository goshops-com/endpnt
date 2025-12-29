'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEnvironments } from '@/store/store-context'
import type { KeyValue, Environment } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface VariableRowProps {
  variable: KeyValue
  onUpdate: (updates: Partial<KeyValue>) => void
  onDelete: () => void
}

function VariableRow({ variable, onUpdate, onDelete }: VariableRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editKey, setEditKey] = useState(variable.key)
  const [editValue, setEditValue] = useState(variable.value)

  const handleSave = () => {
    onUpdate({ key: editKey, value: editValue })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditKey(variable.key)
    setEditValue(variable.value)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <tr className="border-b">
        <td className="py-2 pr-2">
          <input
            type="checkbox"
            checked={variable.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="h-4 w-4"
          />
        </td>
        <td className="py-2 pr-2">
          <Input
            value={editKey}
            onChange={(e) => setEditKey(e.target.value)}
            className="h-8"
          />
        </td>
        <td className="py-2 pr-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8"
          />
        </td>
        <td className="py-2">
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b group">
      <td className="py-2 pr-2">
        <input
          type="checkbox"
          checked={variable.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="h-4 w-4"
        />
      </td>
      <td className="py-2 pr-2 font-mono text-sm">{variable.key}</td>
      <td className="py-2 pr-2 font-mono text-sm text-muted-foreground">{variable.value}</td>
      <td className="py-2">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

interface EnvironmentEditorProps {
  environment: Environment
  onUpdate: (updates: Partial<Environment>) => void
}

function EnvironmentEditor({ environment, onUpdate }: EnvironmentEditorProps) {
  const addVariable = () => {
    const newVar: KeyValue = {
      id: uuidv4(),
      key: '',
      value: '',
      enabled: true,
    }
    onUpdate({ variables: [...environment.variables, newVar] })
  }

  const updateVariable = (id: string, updates: Partial<KeyValue>) => {
    onUpdate({
      variables: environment.variables.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    })
  }

  const deleteVariable = (id: string) => {
    onUpdate({
      variables: environment.variables.filter((v) => v.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Environment Name</label>
        <Input
          value={environment.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="mt-1"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Variables</label>
          <Button size="sm" variant="outline" onClick={addVariable}>
            <Plus className="h-4 w-4 mr-1" />
            Add Variable
          </Button>
        </div>

        <div className="border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-2 w-8"></th>
                <th className="text-left py-2 px-2">Variable</th>
                <th className="text-left py-2 px-2">Value</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {environment.variables.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No variables yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                environment.variables.map((variable) => (
                  <VariableRow
                    key={variable.id}
                    variable={variable}
                    onUpdate={(updates) => updateVariable(variable.id, updates)}
                    onDelete={() => deleteVariable(variable.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function EnvironmentManager() {
  const {
    environments,
    activeEnvironmentId,
    activeEnvironment,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
  } = useEnvironments()

  const [isOpen, setIsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newEnvName, setNewEnvName] = useState('')
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null)

  const selectedEnv = selectedEnvId
    ? environments.find((e) => e.id === selectedEnvId) ?? null
    : null

  const handleCreate = () => {
    if (newEnvName.trim()) {
      const env = createEnvironment(newEnvName.trim())
      setNewEnvName('')
      setIsCreateOpen(false)
      setSelectedEnvId(env.id)
    }
  }

  const handleDelete = (id: string) => {
    deleteEnvironment(id)
    if (selectedEnvId === id) {
      setSelectedEnvId(environments.length > 1 ? environments[0].id : null)
    }
  }

  return (
    <>
      {/* Environment Selector in Header */}
      <div className="flex items-center gap-2">
        <Select
          value={activeEnvironmentId || 'none'}
          onValueChange={(value) => setActiveEnvironment(value === 'none' ? null : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="No Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Environment</SelectItem>
            {environments.map((env) => (
              <SelectItem key={env.id} value={env.id}>
                {env.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Manage environments">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Manage Environments</DialogTitle>
              <DialogDescription>
                Create and manage environment variables for your API requests.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-4 h-[400px]">
              {/* Environment List */}
              <div className="w-48 border-r pr-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Environments</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsCreateOpen(true)} aria-label="Create environment">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-1">
                    {environments.map((env) => (
                      <div
                        key={env.id}
                        className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-accent ${
                          selectedEnvId === env.id ? 'bg-accent' : ''
                        }`}
                        onClick={() => setSelectedEnvId(env.id)}
                      >
                        <span className="text-sm truncate">{env.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(env.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {environments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No environments
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Environment Editor */}
              <div className="flex-1 overflow-auto">
                {selectedEnv ? (
                  <EnvironmentEditor
                    environment={selectedEnv}
                    onUpdate={(updates) => updateEnvironment(selectedEnv.id, updates)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>Select an environment to edit</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Create Environment Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Environment</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              placeholder="e.g., Development, Production"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
