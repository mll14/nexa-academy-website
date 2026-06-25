import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Lock, Search, Shield, Users, CheckCircle2, Circle } from 'lucide-react'
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

function RoleEditorScreen({ mode, roleId }: { mode: RoleEditorMode; roleId?: number }) {
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
          if (!roleId || Number.isNaN(roleId)) throw new Error('Invalid role.')
          const [permissions, existingRole] = await Promise.all([getPermissions(), getRole(roleId)])
          if (!active) return
          setAllPermissions(permissions)
          setRole(existingRole)
          setName(existingRole.name)
          setSlug(existingRole.slug)
          setDescription(existingRole.description ?? '')
          setSelectedPerms(existingRole.permissions.map(p => p.id))
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load role details.')
        if (active) navigate({ to: '/admin/users', search: { tab: 'roles' }, replace: true } as never)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [mode, navigate, roleId])

  const groupedPermissions = groupPermissionsByResource(allPermissions)

  const normalizedSearch = search.trim().toLowerCase()
  const filteredGroups = groupedPermissions
    .map(([resource, perms]) => [
      resource,
      perms.filter(p => {
        if (!normalizedSearch) return true
        return `${p.name} ${p.codename} ${p.resource} ${p.action}`.toLowerCase().includes(normalizedSearch)
      }),
    ] as const)
    .filter(([, perms]) => perms.length > 0)

  const visibleIds = filteredGroups.flatMap(([, perms]) => perms.map(p => p.id))
  const selectedVisibleCount = visibleIds.filter(id => selectedPerms.includes(id)).length

  const togglePermission = (id: number) =>
    setSelectedPerms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleGroup = (ids: number[]) => {
    const allSelected = ids.every(id => selectedPerms.includes(id))
    setSelectedPerms(prev =>
      allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isNew) {
        await createRole({ name, slug, description, permission_ids: selectedPerms })
        toast.success('Role created.')
      } else if (roleId) {
        await updateRole(roleId, { name, description, permission_ids: selectedPerms })
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

  const coverageGroups = groupedPermissions.map(([resource, perms]) => ({
    resource,
    total: perms.length,
    selected: perms.filter(p => selectedPerms.includes(p.id)).length,
  })).filter(g => g.selected > 0)

  return (
    <AdminLayout>
      <PermissionGate permission="roles.view">
        <div className="space-y-6">

          {/* Header */}
          <div className="flex flex-col gap-1">
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Staff Access · Roles
            </button>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-semibold">
                  {isNew ? 'New Role' : (role?.name ?? 'Edit Role')}
                </h1>
                {!isNew && slug && (
                  <span className="font-mono text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground border">
                    {slug}
                  </span>
                )}
                {role?.is_system && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Lock className="w-3 h-3" /> System role
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedPerms.length} permission{selectedPerms.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <div className="h-48 rounded-2xl border bg-muted/30 animate-pulse" />
                <div className="h-96 rounded-2xl border bg-muted/30 animate-pulse" />
              </div>
              <div className="h-64 rounded-2xl border bg-muted/30 animate-pulse" />
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Identity */}
                <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                  <p className="text-sm font-semibold text-foreground">Role Identity</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Role Name</Label>
                      <Input
                        value={name}
                        onChange={e => {
                          setName(e.target.value)
                          if (isNew) setSlug(slugify(e.target.value))
                        }}
                        placeholder="e.g. Admissions Officer"
                        required
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Slug</Label>
                      <div className="relative">
                        {!isNew && <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />}
                        <Input
                          value={slug}
                          onChange={e => { if (isNew) setSlug(slugify(e.target.value)) }}
                          placeholder="admissions_officer"
                          readOnly={!isNew}
                          required
                          className={`text-sm font-mono ${!isNew ? 'pl-8 bg-muted/30 text-muted-foreground' : ''}`}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isNew ? 'Auto-generated from name. Adjust before saving.' : 'Fixed after creation.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Textarea
                        rows={3}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Who is this role for and what should it control?"
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Permissions */}
                <section className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-3 px-5 pt-5 pb-4 border-b sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Permissions</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {selectedVisibleCount} of {visibleIds.length} visible selected
                        {normalizedSearch && ` · filtered by "${search}"`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        disabled={visibleIds.length === 0 || selectedVisibleCount === visibleIds.length}
                        onClick={() => setSelectedPerms(prev => [...new Set([...prev, ...visibleIds])])}
                      >
                        Select all visible
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8"
                        disabled={selectedVisibleCount === 0}
                        onClick={() => setSelectedPerms(prev => prev.filter(id => !visibleIds.includes(id)))}
                      >
                        Clear visible
                      </Button>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search permissions…"
                        className="pl-9 h-9 text-sm"
                      />
                    </div>

                    {filteredGroups.length === 0 ? (
                      <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                        No permissions match "{search}".
                      </div>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {filteredGroups.map(([resource, perms]) => {
                          const ids = perms.map(p => p.id)
                          const selectedCount = ids.filter(id => selectedPerms.includes(id)).length
                          const allSelected = selectedCount === perms.length
                          const pct = perms.length > 0 ? (selectedCount / perms.length) * 100 : 0

                          return (
                            <div key={resource} className="rounded-xl border bg-muted/20 overflow-hidden">
                              {/* Group header */}
                              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-card">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate">{formatPermissionResource(resource)}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="h-1 w-20 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? 'bg-success' : pct > 0 ? 'bg-primary' : 'bg-muted'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      {selectedCount}/{perms.length}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleGroup(ids)}
                                  className="text-xs text-primary hover:underline shrink-0"
                                >
                                  {allSelected ? 'Deselect all' : 'Select all'}
                                </button>
                              </div>

                              {/* Permission rows */}
                              <div className="divide-y">
                                {perms.map(p => {
                                  const checked = selectedPerms.includes(p.id)
                                  return (
                                    <label
                                      key={p.id}
                                      className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                                        checked ? 'bg-primary/5' : 'hover:bg-background'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => togglePermission(p.id)}
                                        className="sr-only"
                                      />
                                      {checked
                                        ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                        : <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                                      }
                                      <span className="min-w-0 flex-1">
                                        <span className={`block text-xs font-medium ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                          {p.name}
                                        </span>
                                        <span className="block text-[10px] font-mono text-muted-foreground/60 truncate">
                                          {p.codename}
                                        </span>
                                      </span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={goBack}>Cancel</Button>
                  <Button type="submit" disabled={saving} className="min-w-28">
                    {saving ? 'Saving…' : isNew ? 'Create Role' : 'Save Changes'}
                  </Button>
                </div>
              </form>

              {/* Sidebar */}
              <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">

                {/* Stats */}
                <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
                  <p className="text-sm font-semibold">Overview</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/40 border px-3 py-3">
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Assigned</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xl font-bold">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {role?.user_count ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/40 border px-3 py-3">
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Selected</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xl font-bold">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        {selectedPerms.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Type</span>
                      {role?.is_system
                        ? <Badge variant="outline" className="gap-1 text-[10px] h-5"><Lock className="w-2.5 h-2.5" /> System</Badge>
                        : <Badge variant="secondary" className="text-[10px] h-5">Custom</Badge>
                      }
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Areas covered</span>
                      <span className="font-medium text-foreground">{coverageGroups.length} / {groupedPermissions.length}</span>
                    </div>
                  </div>
                </section>

                {/* Live coverage */}
                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-sm font-semibold">Permission Coverage</p>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-4">Access areas with at least one permission enabled.</p>

                  {coverageGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No permissions selected yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {coverageGroups.map(g => (
                        <div key={g.resource}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate">{formatPermissionResource(g.resource)}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              {g.selected}/{g.total}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${g.selected === g.total ? 'bg-success' : 'bg-primary'}`}
                              style={{ width: `${(g.selected / g.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
