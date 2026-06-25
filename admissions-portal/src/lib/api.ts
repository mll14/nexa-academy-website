/**
 * Barrel re-export — all existing imports of `../lib/api` continue to work.
 * New code should import from the domain modules directly:
 *   import { login } from '../lib/api/auth'
 *   import { getApplications } from '../lib/api/applications'
 */
export * from "./api/core";
export * from "./api/auth";
export * from "./api/applications";
export * from "./api/programs";
export * from "./api/payments";
export * from "./api/notifications";
export * from "./api/appointments";
