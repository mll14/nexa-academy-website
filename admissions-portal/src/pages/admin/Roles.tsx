import { useState, useEffect, useCallback } from 'react'
import { AdminLayout } from '../../components/AdminLayout'
import { PermissionGate } from '../../components/PermissionGate'
import { useAuth } from '../../context/AuthContext'
import { getRoles, createRole, updateRole, deleteRole, getPermissions } from '../../lib/api'
import type { Role, AppPermission } from '../../types'
import { Plus, Pencil, Trash2, Lock, Users } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Dialog } from '../../components/ui/dialog'
import { DeleteConfirmDialog } from '../../components/ui/delete-confirm-dialog'
import toast from 'react-hot-toast'

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function RoleDialog({
  role,
  allPermissions,
  onClose,
  onSaved,
}: {
  role: Role | null
  allPermissions: AppPermission[]
  onClose: () => void
  onSaved: (r: Role) => void
}) {
  const [name, setName] = useState(role?.name ?? '')
  const [slug, setSlug] = useState(role?.slug ?? '')
  const [desc, setDesc] = useState(role?.description ?? '')
  const [selectedPerms, setSelectedPerms] = useState<number[]>(role?.permissions.map(p => p.id) ?? [])
  const [saving, setSaving] = useState(false)
  const isNew = !role

  const togglePerm = (id: number) =>
    setSelectedPerms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const grouped = allPermissions.reduce<Record<string, AppPermission[]>>((acc, p) => {
    ;(acc[p.resource] ??= []).push(p)
    return acc
  }, {})

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = isNew
        ? await createRole({ name, slug, description: desc, permission_ids: selectedPerms })
        : await updateRole(role!.id, { name, description: desc, permission_ids: selectedPerms })
      onSaved(saved)
      toast.success(isNew ? 'Role created.' : 'Role updated.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title={isNew ? 'Create Role' : `Edit ${role.name}`} className="max-w-lg">
        <form onSubmit={handle} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Role Name</Label>
            <Input
              value={name}
              onChange={e => { setName(e.target.value); if (isNew) setSlug(slugify(e.target.value)) }}
              placeholder="e.g. Finance Manager"
              required
            />
          </div>
          {isNew && (
            <div className="space-y-1.5">
              <Label>Slug <span className="text-muted-foreground text-xs">(auto-generated, must be unique)</span></Label>
              <Input value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="finance_manager" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this role do?" />
          </div>

          <div className="space-y-2">
            <Label>Permissions ({selectedPerms.length} selected)</Label>
            <div className="border rounded-xl p-3 space-y-4 max-h-72 overflow-y-auto">
              {Object.entries(grouped).map(([resource, perms]) => (
                <div key={resource}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{resource.replace(/_/g, ' ')}</p>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        const ids = perms.map(p => p.id)
                        const allSelected = ids.every(id => selectedPerms.includes(id))
                        setSelectedPerms(prev =>
                          allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]
                        )
                      }}
                    >
                      {perms.every(p => selectedPerms.includes(p.id)) ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {perms.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={selectedPerms.includes(p.id)}
                          onChange={() => togglePerm(p.id)}
                          className="rounded"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create Role' : 'Save Changes'}</Button>
          </div>
        </form>
    </Dialog>
  )
}

export function Roles() {
  const { isFullAdmin } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<AppPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Role | null | 'new'>('new' as never)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [roleList, perms] = await Promise.all([getRoles(), getPermissions()])
      setRoles(roleList)
      setAllPermissions(perms)
    } catch {
      toast.error('Failed to load roles.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (r: Role) => { setEditing(r); setDialogOpen(true) }

  const handleDelete = (role: Role) => setDeleteTarget(role)

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteRole(deleteTarget.id)
      setRoles(prev => prev.filter(r => r.id !== deleteTarget.id))
      toast.success('Role deleted.')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout>
      <PermissionGate permission="roles.view">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Roles</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Define what each role can do. System roles cannot be deleted.</p>
            </div>
            {isFullAdmin() && (
              <Button onClick={openNew} className="gap-2">
                <Plus className="w-4 h-4" /> New Role
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
          ) : (
            <div className="space-y-3">
              {roles.map(role => (
                <div key={role.id} className="border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold">{role.name}</h3>
                        {role.is_system && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Lock className="w-3 h-3" /> System
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-mono">{role.slug}</span>
                      </div>
                      {role.description && <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{role.user_count} user{role.user_count !== 1 ? 's' : ''}</span>
                        <span>{role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {isFullAdmin() && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(role)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {!role.is_system && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(role)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {dialogOpen && (
          <RoleDialog
            role={editing as Role | null}
            allPermissions={allPermissions}
            onClose={() => { setDialogOpen(false); setEditing(null) }}
            onSaved={saved => {
              setRoles(prev => {
                const idx = prev.findIndex(r => r.id === saved.id)
                if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
                return [saved, ...prev]
              })
            }}
          />
        )}

        <DeleteConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={doDelete}
          title="Delete Role"
          itemName={deleteTarget?.name ?? ''}
          consequences="Users assigned to this role will lose all associated permissions and become super admins. This action cannot be undone."
          isPending={deleting}
        />
      </PermissionGate>
    </AdminLayout>
  )
}
