import type { AppPermission } from '../../types'

export function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export function formatPermissionResource(resource: string) {
  return resource
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

export function groupPermissionsByResource(permissions: AppPermission[]) {
  return Object.entries(
    permissions.reduce<Record<string, AppPermission[]>>((acc, permission) => {
      ;(acc[permission.resource] ??= []).push(permission)
      return acc
    }, {}),
  ).sort(([left], [right]) => left.localeCompare(right))
}
