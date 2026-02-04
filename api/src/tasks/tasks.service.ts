import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RequestUser,
  resolveOrgScope,
  canAccessOrg,
  OrgReference,
} from '@turbovets-fullstack/auth';
import { Task, Organization, TaskCategory } from '../entities';
import { TasksQueryDto } from './dto/tasks-query.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /**
   * Get the org scope for a user (allowed org IDs).
   * This is the core method that applies org hierarchy rules.
   */
  async getOrgScope(user: RequestUser) {
    // Get user's org
    const userOrg = await this.orgRepo.findOne({
      where: { id: user.orgId },
    });

    if (!userOrg) {
      return { allowedOrgIds: [], canAccessChildren: false, isParentOrg: false };
    }

    // Get child orgs (only if user is in a parent org)
    let childOrgs: OrgReference[] = [];
    if (userOrg.parentId === null) {
      childOrgs = await this.orgRepo.find({
        where: { parentId: userOrg.id },
        select: ['id', 'parentId'],
      });
    }

    return resolveOrgScope(user, userOrg, childOrgs);
  }

  /**
   * Find all tasks the user can access (org-scoped).
   */
  async findAll(user: RequestUser, query?: TasksQueryDto): Promise<Task[]> {
    const { allowedOrgIds } = await this.getOrgScope(user);

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .where('task.organizationId IN (:...orgIds)', { orgIds: allowedOrgIds });

    // Apply filters
    if (query?.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }
    if (query?.category) {
      qb.andWhere('task.category = :category', { category: query.category });
    }

    // Order by org, then position
    qb.orderBy('task.organizationId', 'ASC').addOrderBy('task.position', 'ASC');

    return qb.getMany();
  }

  /**
   * Find a single task by ID (with org access check).
   */
  async findOne(user: RequestUser, taskId: string): Promise<Task | null> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['organization'],
    });

    if (!task) {
      return null;
    }

    // Check org access
    const userOrg = await this.orgRepo.findOne({ where: { id: user.orgId } });
    if (!userOrg) {
      return null;
    }

    const hasAccess = canAccessOrg(user, task.organizationId, userOrg, task.organization);
    if (!hasAccess) {
      return null;
    }

    return task;
  }

  /**
   * Create a new task (in user's org).
   */
  async create(
    user: RequestUser,
    data: { title: string; description?: string; category?: TaskCategory },
  ): Promise<Task> {
    // Get max position for the org
    const maxPosition = await this.taskRepo
      .createQueryBuilder('task')
      .select('MAX(task.position)', 'max')
      .where('task.organizationId = :orgId', { orgId: user.orgId })
      .getRawOne();

    const task = this.taskRepo.create({
      title: data.title,
      description: data.description,
      category: data.category,
      ownerId: user.userId,
      organizationId: user.orgId,
      position: (maxPosition?.max ?? -1) + 1,
    });

    return this.taskRepo.save(task);
  }

  /**
   * Update a task (with org access check).
   */
  async update(
    user: RequestUser,
    taskId: string,
    data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'category' | 'position'>>,
  ): Promise<Task | null> {
    const task = await this.findOne(user, taskId);
    if (!task) {
      return null;
    }

    Object.assign(task, data);
    return this.taskRepo.save(task);
  }

  /**
   * Delete a task (with org access check).
   */
  async delete(user: RequestUser, taskId: string): Promise<boolean> {
    const task = await this.findOne(user, taskId);
    if (!task) {
      return false;
    }

    await this.taskRepo.remove(task);
    return true;
  }
}
