import { Role } from '../../lib/enums/role.enum';
import { RequestUser } from '../../lib/interfaces/request-user.interface';
import {
  resolveOrgScope,
  canAccessOrg,
  getOrgIdsForQuery,
  OrgReference,
} from './org-scope.helper';

const PARENT_ORG: OrgReference = { id: 'org-parent', parentId: null };
const CHILD_ORG_A: OrgReference = { id: 'org-child-a', parentId: 'org-parent' };
const CHILD_ORG_B: OrgReference = { id: 'org-child-b', parentId: 'org-parent' };

function makeUser(role: Role, orgId: string): RequestUser {
  return { userId: 'user-1', role, orgId };
}

describe('resolveOrgScope', () => {
  it('OWNER in parent org → own org + children', () => {
    const result = resolveOrgScope(
      makeUser(Role.OWNER, 'org-parent'),
      PARENT_ORG,
      [CHILD_ORG_A, CHILD_ORG_B],
    );
    expect(result.allowedOrgIds).toEqual(['org-parent', 'org-child-a', 'org-child-b']);
    expect(result.canAccessChildren).toBe(true);
    expect(result.isParentOrg).toBe(true);
  });

  it('ADMIN in parent org → own org only', () => {
    const result = resolveOrgScope(
      makeUser(Role.ADMIN, 'org-parent'),
      PARENT_ORG,
      [CHILD_ORG_A, CHILD_ORG_B],
    );
    expect(result.allowedOrgIds).toEqual(['org-parent']);
    expect(result.canAccessChildren).toBe(false);
  });

  it('VIEWER in parent org → own org only', () => {
    const result = resolveOrgScope(
      makeUser(Role.VIEWER, 'org-parent'),
      PARENT_ORG,
      [CHILD_ORG_A],
    );
    expect(result.allowedOrgIds).toEqual(['org-parent']);
    expect(result.canAccessChildren).toBe(false);
  });

  it('any role in child org → own org only (no upward visibility)', () => {
    const result = resolveOrgScope(
      makeUser(Role.OWNER, 'org-child-a'),
      CHILD_ORG_A,
      [],
    );
    expect(result.allowedOrgIds).toEqual(['org-child-a']);
    expect(result.canAccessChildren).toBe(false);
    expect(result.isParentOrg).toBe(false);
  });
});

describe('canAccessOrg', () => {
  it('same org → allowed for any role', () => {
    const user = makeUser(Role.VIEWER, 'org-parent');
    expect(canAccessOrg(user, 'org-parent', PARENT_ORG, PARENT_ORG)).toBe(true);
  });

  it('OWNER in parent accessing child org → allowed', () => {
    const user = makeUser(Role.OWNER, 'org-parent');
    expect(canAccessOrg(user, 'org-child-a', PARENT_ORG, CHILD_ORG_A)).toBe(true);
  });

  it('ADMIN in parent accessing child org → denied', () => {
    const user = makeUser(Role.ADMIN, 'org-parent');
    expect(canAccessOrg(user, 'org-child-a', PARENT_ORG, CHILD_ORG_A)).toBe(false);
  });

  it('OWNER in child org accessing parent → denied', () => {
    const user = makeUser(Role.OWNER, 'org-child-a');
    expect(canAccessOrg(user, 'org-parent', CHILD_ORG_A, PARENT_ORG)).toBe(false);
  });

  it('target org is null → denied', () => {
    const user = makeUser(Role.OWNER, 'org-parent');
    expect(canAccessOrg(user, 'org-unknown', PARENT_ORG, null)).toBe(false);
  });
});

describe('getOrgIdsForQuery', () => {
  it('delegates to resolveOrgScope and returns allowedOrgIds', () => {
    const ids = getOrgIdsForQuery(
      makeUser(Role.OWNER, 'org-parent'),
      PARENT_ORG,
      [CHILD_ORG_A],
    );
    expect(ids).toEqual(['org-parent', 'org-child-a']);
  });
});
