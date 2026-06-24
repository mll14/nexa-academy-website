import { useState, useEffect, useCallback, type ComponentType } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { AdminLayout } from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import {
  getStaffUsers,
  getRoles,
  createStaffUser,
  updateStaffUser,
  removeStaffUser,
  resendInvite,
  getAuditLogs,
  getPermissions,
  deleteRole,
  type AuditLogEntry,
} from '../../lib/api'
import type { StaffUser, Role, AppPermission } from '../../types'
import {
  UserPlus,
  UserMinus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  ChevronDown,
  MailIcon,
  Clock,
  Plus,
  Lock,
  Users as UsersIcon,
  ShieldAlert,
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowLeftRight,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Dialog } from '../../components/ui/dialog'
import { Select } from '../../components/ui/select'
import { UnderlineTabs } from '../../components/ui/tabs'
import { formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import { formatPermissionResource, groupPermissionsByResource } from './role-utils'
import { DeleteConfirmDialog } from '../../components/ui/delete-confirm-dialog'

type StaffAccessTab = 'users' | 'roles' | 'audit'

const TAB_CONFIG: { value: StaffAccessTab; label: string; permission?: string; superAdminOnly?: boolean }[] = [
  { value: 'users', label: 'Staff Users', permission: 'users.view' },
  { value: 'roles', label: 'Roles', permission: 'roles.view' },
  { value: 'audit', label: 'Audit Logs', superAdminOnly: true },
]

const ACTION_META: Record<string, { label: string; color: string; Icon: ComponentType<{ className?: string }> }> = {
  // Applications
  update_application_status:  { label: 'Status Updated',           color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',     Icon: ArrowLeftRight },
  delete_application:         { label: 'Application Deleted',      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',          Icon: Trash2 },
  add_application_note:       { label: 'Note Added',               color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', Icon: FileText },
  propose_interview_times:    { label: 'Interview Times Proposed',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', Icon: Calendar },
  schedule_interview:         { label: 'Interview Scheduled',       color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   Icon: Calendar },
  reschedule_interview:       { label: 'Interview Rescheduled',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   Icon: RefreshCw },
  complete_interview:         { label: 'Interview Completed',       color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   Icon: CheckCircle2 },
  cancel_interview:           { label: 'Interview Cancelled',       color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', Icon: XCircle },
  // Leads
  delete_lead_program_interest: { label: 'Program Interest Deleted', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',         Icon: Trash2 },
  delete_lead_help_me:          { label: 'Help Me Lead Deleted',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',         Icon: Trash2 },
  delete_lead_incomplete:       { label: 'Incomplete Lead Deleted',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',         Icon: Trash2 },
  // Staff & Roles
  invite_staff:  { label: 'Staff Invited',  color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',     Icon: UserPlus },
  update_staff:  { label: 'Staff Updated',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',     Icon: Pencil },
  remove_staff:  { label: 'Staff Removed',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', Icon: UserMinus },
  create_role:   { label: 'Role Created',   color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',     Icon: Plus },
  update_role:   { label: 'Role Updated',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',     Icon: Pencil },
  delete_role:   { label: 'Role Deleted',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',         Icon: Trash2 },
}

function RoleBadge({ role }: { role: Role | null }) {
  if (!role) return <Badge variant="outline" className="text-xs gap-1"><ShieldCheck className="w-3 h-3" />Super Admin</Badge>
  return <Badge variant="secondary" className="text-xs">{role.name}</Badge>
}

function InviteDialog({
  roles,
  onClose,
  onCreated,
}: {
  roles: Role[]
  onClose: () => void
  onCreated: (user: StaffUser) => void
}) {
  const [form, setForm] = useState({ email: '', display_name: '', staff_role_id: '' })
  const [saving, setSaving] = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const user = await createStaffUser({
        email: form.email,
        display_name: form.display_name,
        staff_role_id: form.staff_role_id ? Number(form.staff_role_id) : undefined,
      })
      onCreated(user)
      toast.success('Invitation sent.')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send invitation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title="Invite Staff User" className="max-w-md">
      <form onSubmit={handle} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Jane Doe" required />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" required />
        </div>
        <div className="space-y-1.5">
          <Label>Role <span className="text-muted-foreground text-xs">(optional — leave blank for super admin)</span></Label>
          <select
            value={form.staff_role_id}
            onChange={e => setForm(f => ({ ...f, staff_role_id: e.target.value }))}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Super Admin (no restriction)</option>
            {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">An invitation email will be sent so they can set their own password.</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Sending…' : 'Send Invitation'}</Button>
        </div>
      </form>
    </Dialog>
  )
}

function EditDialog({
  staff,
  roles,
  allPermissions,
  onClose,
  onUpdated,
}: {
  staff: StaffUser
  roles: Role[]
  allPermissions: AppPermission[]
  onClose: () => void
  onUpdated: (user: StaffUser) => void
}) {
  const [roleId, setRoleId] = useState<string>(staff.staff_role ? String(staff.staff_role.id) : '')
  const [selectedPerms, setSelectedPerms] = useState<number[]>(staff.individual_permissions.map(permission => permission.id))
  const [saving, setSaving] = useState(false)
  const [showPerms, setShowPerms] = useState(false)

  const togglePerm = (id: number) =>
    setSelectedPerms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await updateStaffUser(staff.uid, {
        staff_role_id: roleId ? Number(roleId) : null,
        individual_permission_ids: selectedPerms,
      })
      onUpdated(updated)
      toast.success('User updated.')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const grouped = allPermissions.reduce<Record<string, AppPermission[]>>((acc, permission) => {
    ;(acc[permission.resource] ??= []).push(permission)
    return acc
  }, {})

  return (
    <Dialog open onClose={onClose} title={`Edit ${staff.display_name}`} className="max-w-lg">
      <form onSubmit={handle} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Role</Label>
          <select
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Super Admin (no restriction)</option>
            {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowPerms(value => !value)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showPerms ? 'rotate-180' : ''}`} />
            Individual Permissions ({selectedPerms.length} granted)
          </button>
          {showPerms && (
            <div className="border rounded-xl p-3 space-y-3 max-h-72 overflow-y-auto">
              {Object.entries(grouped).map(([resource, permissions]) => (
                <div key={resource}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 capitalize">{resource.replace('_', ' ')}</p>
                  <div className="space-y-1">
                    {permissions.map(permission => (
                      <label key={permission.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPerms.includes(permission.id)}
                          onChange={() => togglePerm(permission.id)}
                          className="rounded"
                        />
                        {permission.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </div>
      </form>
    </Dialog>
  )
}

function StaffUsersSection() {
  const { isFullAdmin } = useAuth()
  const [staffList, setStaffList] = useState<StaffUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<AppPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<StaffUser | null>(null)
  const [resending, setResending] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<StaffUser | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [users, roleList, permissions] = await Promise.all([
        getStaffUsers(),
        getRoles(),
        getPermissions(),
      ])
      setStaffList(users)
      setRoles(roleList)
      setAllPermissions(permissions)
    } catch {
      toast.error('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRemove = (user: StaffUser) => setRemoveTarget(user)

  const doRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    try {
      await removeStaffUser(removeTarget.uid)
      setStaffList(prev => prev.filter(item => item.uid !== removeTarget.uid))
      toast.success('Admin access removed.')
      setRemoveTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove user.')
    } finally {
      setRemoveLoading(false)
    }
  }

  const handleResendInvite = async (user: StaffUser) => {
    setResending(user.uid)
    try {
      await resendInvite(user.uid)
      toast.success(`Invitation resent to ${user.email}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to resend invitation.')
    } finally {
      setResending(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Staff Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage who has access to this portal and what they can do.</p>
        </div>
        {isFullAdmin() && (
          <Button onClick={() => setInviting(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="sm:hidden">Invite</span>
            <span className="hidden sm:inline">Invite User</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
      ) : (
        <div className="border rounded-xl divide-y">
          {staffList.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No staff users found.</div>
          )}
          {staffList.map(user => (
            <div key={user.uid} className="flex items-center gap-4 px-4 py-3.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!user.invitation_accepted && (
                  <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300 bg-amber-50">
                    <Clock className="w-3 h-3" />Pending
                  </Badge>
                )}
                <RoleBadge role={user.staff_role} />
                {user.individual_permissions.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Shield className="w-3 h-3" />+{user.individual_permissions.length}
                  </Badge>
                )}
              </div>
              {isFullAdmin() && (
                <div className="flex items-center gap-1 shrink-0">
                  {!user.invitation_accepted && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs gap-1 text-muted-foreground"
                      onClick={() => handleResendInvite(user)}
                      disabled={resending === user.uid}
                      title="Resend invitation email"
                    >
                      <MailIcon className="w-3.5 h-3.5" />
                      {resending === user.uid ? 'Sending…' : 'Resend'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(user)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleRemove(user)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {inviting && (
        <InviteDialog
          roles={roles}
          onClose={() => setInviting(false)}
          onCreated={user => setStaffList(prev => [user, ...prev])}
        />
      )}
      {editing && (
        <EditDialog
          staff={editing}
          roles={roles}
          allPermissions={allPermissions}
          onClose={() => setEditing(null)}
          onUpdated={updated => setStaffList(prev => prev.map(user => user.uid === updated.uid ? updated : user))}
        />
      )}

      <DeleteConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={doRemove}
        title="Remove Admin Access"
        itemName={removeTarget?.display_name ?? ''}
        consequences="This user will immediately lose access to the portal. Their account will remain in the system but they will be unable to log in until re-invited."
        isPending={removeLoading}
      />
    </div>
  )
}

function RolesSection() {
  const { isFullAdmin } = useAuth()
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [openCoverageId, setOpenCoverageId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const roleList = await getRoles()
      setRoles(roleList)
    } catch {
      toast.error('Failed to load roles.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => navigate({ to: '/admin/roles/new' })
  const openEdit = (role: Role) => navigate({ to: '/admin/roles/$roleId/edit', params: { roleId: String(role.id) } })

  const handleDelete = (role: Role) => setDeleteTarget(role)

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteRole(deleteTarget.id)
      setRoles(prev => prev.filter(item => item.id !== deleteTarget.id))
      toast.success('Role deleted.')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Define what each role can do. System roles cannot be deleted.</p>
        </div>
        {isFullAdmin() && (
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New Role</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {roles.map(role => (
            <RoleCard
              key={role.id}
              role={role}
              canManage={isFullAdmin()}
              coverageOpen={openCoverageId === role.id}
              onToggleCoverage={() => setOpenCoverageId(prev => prev === role.id ? null : role.id)}
              onEdit={() => openEdit(role)}
              onDelete={() => handleDelete(role)}
            />
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete Role"
        itemName={deleteTarget?.name ?? ''}
        consequences="Users assigned to this role will lose all associated permissions and become super admins. This action cannot be undone."
        isPending={deleteLoading}
      />
    </div>
  )
}

function RoleCard({
  role,
  canManage,
  coverageOpen,
  onToggleCoverage,
  onEdit,
  onDelete,
}: {
  role: Role
  canManage: boolean
  coverageOpen: boolean
  onToggleCoverage: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const permissionGroups = groupPermissionsByResource(role.permissions)

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{role.name}</h3>
            {role.is_system && (
              <Badge variant="outline" className="text-xs gap-1">
                <Lock className="w-3 h-3" /> System
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {role.description || 'No description yet. Use the editor page to explain who this role is for and what it should control.'}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Users</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium">
                <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {role.user_count} assigned
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleCoverage}
              className="rounded-xl border bg-muted/20 px-3 py-2.5 text-left hover:border-primary/40 transition-colors"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Permissions</p>
              <p className="mt-2 flex items-center justify-between text-sm font-medium">
                {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${coverageOpen ? 'rotate-180' : ''}`} />
              </p>
            </button>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            {!role.is_system && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {coverageOpen && (
        <div className="mt-4 border-t pt-4">
          {role.permissions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {permissionGroups.map(([resource, permissions]) => (
                <div key={resource} className="rounded-xl border bg-muted/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{formatPermissionResource(resource)}</p>
                    <Badge variant="outline" className="text-[11px]">{permissions.length}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {permissions.slice(0, 3).map(permission => permission.name).join(' • ')}
                    {permissions.length > 3 ? ` • +${permissions.length - 3} more` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No permissions assigned yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryCell({ summary }: { summary: Record<string, string | null> }) {
  const entries = Object.entries(summary).filter(([, value]) => value != null && value !== '')
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>

  return (
    <div className="space-y-0.5">
      {entries.map(([key, value]) => (
        <p key={key} className="text-xs">
          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}: </span>
          <span className="font-medium">{value}</span>
        </p>
      ))}
    </div>
  )
}

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: '_h1', label: '── Applications ──', disabled: true },
  { value: 'update_application_status', label: 'Status Updated' },
  { value: 'delete_application',        label: 'Application Deleted' },
  { value: 'add_application_note',      label: 'Note Added' },
  { value: 'propose_interview_times',   label: 'Interview Times Proposed' },
  { value: 'schedule_interview',        label: 'Interview Scheduled' },
  { value: 'reschedule_interview',      label: 'Interview Rescheduled' },
  { value: 'complete_interview',        label: 'Interview Completed' },
  { value: 'cancel_interview',          label: 'Interview Cancelled' },
  { value: '_h2', label: '── Leads ──', disabled: true },
  { value: 'delete_lead_program_interest', label: 'Program Interest Deleted' },
  { value: 'delete_lead_help_me',          label: 'Help Me Lead Deleted' },
  { value: 'delete_lead_incomplete',       label: 'Incomplete Lead Deleted' },
  { value: '_h3', label: '── Staff & Roles ──', disabled: true },
  { value: 'invite_staff', label: 'Staff Invited' },
  { value: 'update_staff', label: 'Staff Updated' },
  { value: 'remove_staff', label: 'Staff Removed' },
  { value: 'create_role',  label: 'Role Created' },
  { value: 'update_role',  label: 'Role Updated' },
  { value: 'delete_role',  label: 'Role Deleted' },
]

function AuditLogsSection() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [staffUsers, setStaffUsers] = useState<{ uid: string; display_name: string }[]>([])
  const [filters, setFilters] = useState({ action: '', user: '', date_from: '', date_to: '' })

  useEffect(() => {
    getStaffUsers()
      .then(list => setStaffUsers(list.map(u => ({ uid: u.uid, display_name: u.display_name }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(false)
    getAuditLogs({
      action: filters.action || undefined,
      user: filters.user || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    })
      .then(data => { setLogs(data); setError(false) })
      .catch(() => { toast.error('Failed to load audit logs.'); setError(true) })
      .finally(() => setLoading(false))
  }, [filters])

  const setFilter = (key: keyof typeof filters) => (value: string) =>
    setFilters(f => ({ ...f, [key]: value }))

  const setFilterEvent = (key: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters(f => ({ ...f, [key]: e.target.value }))

  const userOptions = [
    { value: '', label: 'All users' },
    ...staffUsers.map(u => ({ value: u.uid, label: u.display_name })),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-muted-foreground" />
          Audit Logs
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Record of all admin write operations.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={filters.action} onChange={setFilter('action')} options={ACTION_OPTIONS} />
        <Select value={filters.user} onChange={setFilter('user')} options={userOptions} />
        <Input type="date" value={filters.date_from} onChange={setFilterEvent('date_from')} />
        <Input type="date" value={filters.date_to} onChange={setFilterEvent('date_to')} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
      ) : error ? (
        <div className="py-20 text-center border border-dashed border-destructive/40 rounded-2xl">
          <ShieldAlert className="w-8 h-8 text-destructive/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load audit logs. Ensure the database migration has been applied.</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl">
          <ShieldAlert className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No audit log entries match your filters.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden divide-y">
          {logs.map(log => {
            const meta = ACTION_META[log.action] ?? { label: log.action_display, color: 'bg-muted text-muted-foreground', Icon: ShieldAlert }
            const Icon = meta.Icon
            return (
              <div key={log.id} className="flex items-start gap-4 px-4 py-3.5">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                    {log.ip_address && (
                      <span className="text-xs text-muted-foreground font-mono">{log.ip_address}</span>
                    )}
                  </div>
                  <SummaryCell summary={log.resource_summary} />
                </div>
                <div className="text-right shrink-0">
                  {log.performed_by ? (
                    <div className="flex items-center gap-1.5 justify-end">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs font-medium">{log.performed_by.display_name}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">System</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Users() {
  const { hasPermission, isFullAdmin } = useAuth()
  const navigate = useNavigate()
  const search = useSearch({ from: '/admin/users' }) as { tab?: StaffAccessTab }

  const visibleTabs = TAB_CONFIG.filter(tab => {
    if (tab.superAdminOnly) return isFullAdmin()
    return !tab.permission || hasPermission(tab.permission)
  })
  const activeTab = visibleTabs.find(tab => tab.value === search.tab)?.value ?? visibleTabs[0]?.value ?? 'users'

  useEffect(() => {
    if (visibleTabs.length === 0 || search.tab === activeTab) return
    navigate({ to: '/admin/users', search: { tab: activeTab }, replace: true } as never)
  }, [activeTab, navigate, search.tab, visibleTabs.length])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Staff Access</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage staff accounts, permission roles, and security activity from one place.</p>
        </div>

        <UnderlineTabs
          tabs={visibleTabs.map(tab => ({ value: tab.value, label: tab.label }))}
          active={activeTab}
          onChange={tab => navigate({ to: '/admin/users', search: { tab: tab as StaffAccessTab } } as never)}
        />

        {activeTab === 'roles' ? <RolesSection /> : activeTab === 'audit' ? <AuditLogsSection /> : <StaffUsersSection />}
      </div>
    </AdminLayout>
  )
}
