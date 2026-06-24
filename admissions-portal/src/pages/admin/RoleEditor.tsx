import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Lock, Search, Shield, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminLayout } from '../../components/AdminLayout'
import { PermissionGate } from '../../components/PermissionGate'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { useAuth } from '../../context/AuthContext'
import { createRole, getPermissions, getRole, updateRole } from '../../lib/api'
import type { AppPermission, Role } from '../../types'
import { formatPermissionResource, groupPermissionsByResource, slugify } from './role-utils'

type RoleEditorMode = 'create' | 'edit'

function RoleEditorScreen({
  mode,
  roleId,
}: {
  mode: RoleEditorMode
  roleId?: number
}) {
  const { isFullAdmin } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [allPermissions, setAllPermissions] = useState<AppPermission[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPerms, setSelectedPerms] = useState<number[]>([])
  const [search, setSearch] = useState('')

  const isNew = mode === 'create'

  const goBack = () => navigate({ to: '/admin/users', search: { tab: 'roles' } } as never)

  useEffect(() => {
    if (isFullAdmin()) return
    navigate({ to: '/admin/users', search: { tab: 'roles' }, replace: true } as never)
  }, [isFullAdmin, navigate])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      try {
        if (mode === 'create') {
          const permissions = await getPermissions()
          if (!active) return
          setAllPermissions(permissions)
        } else {
          if (!roleId || Number.isNaN(roleId)) {
            throw new Error('Invalid role.')
          }
          const [permissions, existingRole] = await Promise.all([getPermissions(), getRole(roleId)])
          if (!active) return
          setAllPermissions(permissions)
          setRole(existingRole)
          setName(existingRole.name)
          setSlug(existingRole.slug)
          setDescription(existingRole.description ?? '')
          setSelectedPerms(existingRole.permissions.map(permission => permission.id))
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load role details.')
        if (active) {
          navigate({ to: '/admin/users', search: { tab: 'roles' }, replace: true } as never)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [mode, navigate, roleId])

  const groupedPermissions = groupPermissionsByResource(allPermissions)
  const normalizedSearch = search.trim().toLowerCase()
  const filteredGroups = groupedPermissions
    .map(([resource, permissions]) => [
      resource,
      permissions.filter(permission => {
        if (!normalizedSearch) return true
        const haystack = `${permission.name} ${permission.codename} ${permission.resource} ${permission.action}`.toLowerCase()
        return haystack.includes(normalizedSearch)
      }),
    ] as const)
    .filter(([, permissions]) => permissions.length > 0)

  const visiblePermissionIds = filteredGroups.flatMap(([, permissions]) => permissions.map(permission => permission.id))
  const selectedVisibleCount = visiblePermissionIds.filter(id => selectedPerms.includes(id)).length

  const togglePermission = (id: number) => {
    setSelectedPerms(prev => prev.includes(id) ? prev.filter(permissionId => permissionId !== id) : [...prev, id])
  }

  const togglePermissionGroup = (permissionIds: number[]) => {
    const allSelected = permissionIds.every(id => selectedPerms.includes(id))
    setSelectedPerms(prev =>
      allSelected
        ? prev.filter(id => !permissionIds.includes(id))
        : [...new Set([...prev, ...permissionIds])],
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (isNew) {
        await createRole({
          name,
          slug,
          description,
          permission_ids: selectedPerms,
        })
        toast.success('Role created.')
      } else if (roleId) {
        await updateRole(roleId, {
          name,
          description,
          permission_ids: selectedPerms,
        })
        toast.success('Role updated.')
      }
      goBack()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!isFullAdmin()) return null

  return (
    <AdminLayout>
      <PermissionGate permission="roles.view">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Button type="button" variant="ghost" className="h-auto px-0 text-muted-foreground hover:text-foreground" onClick={goBack}>
                <ArrowLeft className="w-4 h-4" /> Back to Staff Access
              </Button>
              <h1 className="mt-3 text-2xl font-semibold">{isNew ? 'Create Role' : `Edit ${role?.name ?? 'Role'}`}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage permissions on a full page so large role definitions are easier to review and maintain.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              {isNew ? 'New Role' : 'Role Editor'}
            </Badge>
          </div>

          {loading ? (
            <div className="flex min-h-60 items-center justify-center rounded-2xl border text-sm text-muted-foreground">Loading role details…</div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Role Name</Label>
                      <Input
                        value={name}
                        onChange={event => {
                          setName(event.target.value)
                          if (isNew) setSlug(slugify(event.target.value))
                        }}
                        placeholder="e.g. Finance Manager"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>{isNew ? 'Slug' : 'Role Slug'}</Label>
                      <Input
                        value={slug}
                        onChange={event => {
                          if (isNew) setSlug(slugify(event.target.value))
                        }}
                        placeholder="finance_manager"
                        readOnly={!isNew}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        {isNew ? 'Generated from the role name. You can still adjust it before saving.' : 'Role slugs stay fixed after creation.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Selection Summary</Label>
                      <div className="flex h-10 items-center rounded-xl border bg-muted/30 px-3 text-sm text-muted-foreground">
                        {selectedPerms.length} permission{selectedPerms.length !== 1 ? 's' : ''} selected
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={4}
                        value={description}
                        onChange={event => setDescription(event.target.value)}
                        placeholder="Describe what this role should control and any limits the team should know about."
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Permissions</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Browse by access area, search by permission name, and bulk select the groups you need.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                        {selectedVisibleCount}/{visiblePermissionIds.length} visible selected
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={visiblePermissionIds.length === 0}
                        onClick={() => setSelectedPerms(prev => [...new Set([...prev, ...visiblePermissionIds])])}
                      >
                        Select visible
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={selectedVisibleCount === 0}
                        onClick={() => setSelectedPerms(prev => prev.filter(id => !visiblePermissionIds.includes(id)))}
                      >
                        Clear visible
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Search permissions, actions, or resource groups"
                        className="pl-9"
                      />
                    </div>

                    {filteredGroups.length === 0 ? (
                      <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                        No permissions match this search.
                      </div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {filteredGroups.map(([resource, permissions]) => {
                          const permissionIds = permissions.map(permission => permission.id)
                          const groupSelectedCount = permissionIds.filter(id => selectedPerms.includes(id)).length

                          return (
                            <div key={resource} className="rounded-2xl border bg-muted/20 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">{formatPermissionResource(resource)}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {groupSelectedCount}/{permissions.length} permission{permissions.length !== 1 ? 's' : ''} selected
                                  </p>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => togglePermissionGroup(permissionIds)}>
                                  {groupSelectedCount === permissions.length ? 'Clear group' : 'Select group'}
                                </Button>
                              </div>

                              <div className="mt-4 space-y-2">
                                {permissions.map(permission => (
                                  <label
                                    key={permission.id}
                                    className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-background"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedPerms.includes(permission.id)}
                                      onChange={() => togglePermission(permission.id)}
                                      className="mt-0.5 rounded"
                                    />
                                    <span className="min-w-0">
                                      <span className="block font-medium text-foreground">{permission.name}</span>
                                      <span className="mt-0.5 block text-xs text-muted-foreground">
                                        {permission.codename}
                                      </span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <div className="flex flex-col-reverse justify-end gap-3 border-t pt-4 sm:flex-row">
                  <Button type="button" variant="outline" onClick={goBack}>Cancel</Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : isNew ? 'Create Role' : 'Save Changes'}
                  </Button>
                </div>
              </form>

              <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-sm font-semibold">Role Snapshot</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      {role?.is_system ? (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="w-3 h-3" /> System role
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Custom role</Badge>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Users assigned</span>
                      <span className="font-medium">{role?.user_count ?? 0}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Permission areas</span>
                      <span className="font-medium">{groupedPermissions.length}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Selected permissions</span>
                      <span className="font-medium">{selectedPerms.length}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-sm font-semibold">What changes here</p>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p>Role permissions are grouped by access area so large role definitions stay readable.</p>
                    </div>
                    <div className="flex gap-3">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p>Changes affect every staff user assigned to this role after the update is saved.</p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </PermissionGate>
    </AdminLayout>
  )
}

export function CreateRolePage() {
  return <RoleEditorScreen mode="create" />
}

export function EditRolePage() {
  const { roleId } = useParams({ from: '/admin/roles/$roleId/edit' })
  return <RoleEditorScreen mode="edit" roleId={Number(roleId)} />
}
