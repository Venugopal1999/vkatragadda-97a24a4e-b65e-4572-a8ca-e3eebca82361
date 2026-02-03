import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, Organization } from '../entities';
import { RequestUser, Role } from '@turbovets-fullstack/auth';

export interface AuditEntry {
  user: RequestUser | null;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  allowed: boolean;
  ipAddress?: string;
  changes?: Record<string, unknown>;
}

export interface AuditLogResponse {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string | null;
  organizationId: string;
  allowed: boolean;
  ipAddress: string | null;
  createdAt: Date;
  user: { id: string; email: string; role: string } | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async log(entry: AuditEntry): Promise<AuditLog> {
    const auditLog = this.auditRepo.create({
      userId: entry.user?.userId ?? null,
      organizationId: entry.user?.orgId ?? null,
      action: entry.action,
      entityType: entry.resource,
      entityId: entry.resourceId ?? 'N/A',
      allowed: entry.allowed,
      ipAddress: entry.ipAddress ?? null,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
    });

    return this.auditRepo.save(auditLog);
  }

  async findAll(user: RequestUser, limit = 100): Promise<AuditLogResponse[]> {
    // Get allowed org IDs based on role
    const allowedOrgIds = await this.getOrgScope(user);

    const qb = this.auditRepo
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.organizationId IN (:...orgIds)', { orgIds: allowedOrgIds })
      .orderBy('audit.createdAt', 'DESC')
      .take(limit);

    const logs = await qb.getMany();

    // Transform to exclude sensitive data
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      organizationId: log.organizationId,
      allowed: log.allowed,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
      user: log.user
        ? { id: log.user.id, email: log.user.email, role: log.user.role }
        : null,
    }));
  }

  private async getOrgScope(user: RequestUser): Promise<string[]> {
    const userOrg = await this.orgRepo.findOne({ where: { id: user.orgId } });
    if (!userOrg) return [user.orgId];

    // OWNER in parent org can see parent + children
    if (userOrg.parentId === null && user.role === Role.OWNER) {
      const childOrgs = await this.orgRepo.find({
        where: { parentId: userOrg.id },
        select: ['id'],
      });
      return [user.orgId, ...childOrgs.map((o) => o.id)];
    }

    // Everyone else sees only their org
    return [user.orgId];
  }
}
