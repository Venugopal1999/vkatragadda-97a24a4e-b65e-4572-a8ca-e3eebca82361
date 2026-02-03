import { Role } from '../enums/role.enum';
import { RequestUser } from '../interfaces/request-user.interface';

/**
 * Minimal org interface for scoping logic.
 * Matches the shape needed from Organization entity.
 */
export interface OrgReference {
  id: string;
  parentId: string | null;
}

/**
 * Result of org scope resolution.
 */
export interface OrgScopeResult {
  /** List of org IDs the user can access */
  allowedOrgIds: string[];
  /** Whether user can access child orgs (OWNER in parent only) */
  canAccessChildren: boolean;
  /** Whether user is in a parent org (has no parentId) */
  isParentOrg: boolean;
}

/**
 * Resolve which org IDs a user can access based on role and org hierarchy.
 *
 * Rules:
 * - OWNER in parent org → can access parent + all direct children
 * - ADMIN in parent org → can access parent only
 * - VIEWER in parent org → can access parent only
 * - Any role in child org → can access own org only (no upward visibility)
 *
 * @param user - The authenticated user (from JWT)
 * @param userOrg - The user's organization (with parentId)
 * @param childOrgs - Direct children of user's org (empty if user is in child org)
 * @returns OrgScopeResult with allowed org IDs and flags
 */
export function resolveOrgScope(
  user: RequestUser,
  userOrg: OrgReference,
  childOrgs: OrgReference[] = [],
): OrgScopeResult {
  const isParentOrg = userOrg.parentId === null;
  const canAccessChildren = isParentOrg && user.role === Role.OWNER;

  // Always include user's own org
  const allowedOrgIds = [user.orgId];

  // OWNER in parent org can also access child orgs
  if (canAccessChildren) {
    for (const child of childOrgs) {
      allowedOrgIds.push(child.id);
    }
  }

  return {
    allowedOrgIds,
    canAccessChildren,
    isParentOrg,
  };
}

/**
 * Check if a user can access a specific organization.
 *
 * @param user - The authenticated user
 * @param targetOrgId - The org ID being accessed
 * @param userOrg - The user's organization
 * @param targetOrg - The target organization (to check if it's a child of user's org)
 * @returns true if access is allowed
 */
export function canAccessOrg(
  user: RequestUser,
  targetOrgId: string,
  userOrg: OrgReference,
  targetOrg: OrgReference | null,
): boolean {
  // Same org = always allowed
  if (user.orgId === targetOrgId) {
    return true;
  }

  // User must be in parent org and be OWNER to access children
  const isParentOrg = userOrg.parentId === null;
  if (!isParentOrg || user.role !== Role.OWNER) {
    return false;
  }

  // Target must be a direct child of user's org
  if (targetOrg && targetOrg.parentId === user.orgId) {
    return true;
  }

  return false;
}

/**
 * Build a WHERE clause condition for org-scoped queries.
 * Returns the org IDs to use in an IN clause.
 *
 * Usage in TypeORM:
 * ```typescript
 * const { allowedOrgIds } = await this.getOrgScope(user);
 * return this.taskRepo.find({
 *   where: { organizationId: In(allowedOrgIds) }
 * });
 * ```
 *
 * @param user - The authenticated user
 * @param userOrg - The user's organization
 * @param childOrgs - Direct children of user's org
 * @returns Array of allowed org IDs for query filtering
 */
export function getOrgIdsForQuery(
  user: RequestUser,
  userOrg: OrgReference,
  childOrgs: OrgReference[] = [],
): string[] {
  return resolveOrgScope(user, userOrg, childOrgs).allowedOrgIds;
}
