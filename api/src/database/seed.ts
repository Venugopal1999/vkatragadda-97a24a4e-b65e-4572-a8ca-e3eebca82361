import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Organization,
  User,
  Task,
  AuditLog,
  Role,
  TaskStatus,
  TaskCategory,
} from '../entities';

const dataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DATABASE_NAME || 'taskdb.sqlite',
  entities: [Organization, User, Task, AuditLog],
  synchronize: true,
});

async function seed() {
  console.log('Connecting to database...');
  await dataSource.initialize();

  const orgRepo = dataSource.getRepository(Organization);
  const userRepo = dataSource.getRepository(User);
  const taskRepo = dataSource.getRepository(Task);

  // --- Upsert Organizations ---
  console.log('\nUpserting organizations...');

  let parentOrg = await orgRepo.findOne({ where: { name: 'Acme Corp' } });
  if (!parentOrg) {
    parentOrg = orgRepo.create({ name: 'Acme Corp', parentId: null });
    await orgRepo.save(parentOrg);
    console.log('  Created: Acme Corp (parent)');
  } else {
    console.log('  Exists:  Acme Corp (parent)');
  }

  let childOrg = await orgRepo.findOne({ where: { name: 'Acme East' } });
  if (!childOrg) {
    childOrg = orgRepo.create({ name: 'Acme East', parentId: parentOrg.id });
    await orgRepo.save(childOrg);
    console.log('  Created: Acme East (child)');
  } else {
    // Ensure parentId is correct
    if (childOrg.parentId !== parentOrg.id) {
      childOrg.parentId = parentOrg.id;
      await orgRepo.save(childOrg);
    }
    console.log('  Exists:  Acme East (child)');
  }

  // --- Upsert Users ---
  console.log('\nUpserting users...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const usersData = [
    {
      email: 'owner@acme.com',
      role: Role.OWNER,
      organizationId: parentOrg.id,
      orgName: 'Acme Corp',
    },
    {
      email: 'admin@east.acme.com',
      role: Role.ADMIN,
      organizationId: childOrg.id,
      orgName: 'Acme East',
    },
    {
      email: 'viewer@east.acme.com',
      role: Role.VIEWER,
      organizationId: childOrg.id,
      orgName: 'Acme East',
    },
  ];

  const users: Record<string, User> = {};

  for (const userData of usersData) {
    let user = await userRepo.findOne({ where: { email: userData.email } });
    if (!user) {
      user = userRepo.create({
        email: userData.email,
        passwordHash,
        role: userData.role,
        organizationId: userData.organizationId,
      });
      await userRepo.save(user);
      console.log(`  Created: ${userData.email} (${userData.role}, ${userData.orgName})`);
    } else {
      // Update role and org if changed
      user.role = userData.role;
      user.organizationId = userData.organizationId;
      user.passwordHash = passwordHash;
      await userRepo.save(user);
      console.log(`  Updated: ${userData.email} (${userData.role}, ${userData.orgName})`);
    }
    users[userData.email] = user;
  }

  // --- Upsert Tasks (by title + org) ---
  console.log('\nUpserting tasks...');

  // Delete existing seeded tasks for these orgs first (cleaner than upsert for tasks)
  const existingTasks = await taskRepo.find({
    where: [
      { organizationId: parentOrg.id },
      { organizationId: childOrg.id },
    ],
  });
  if (existingTasks.length > 0) {
    await taskRepo.remove(existingTasks);
    console.log(`  Removed ${existingTasks.length} existing tasks`);
  }

  const tasksData = [
    // Parent org tasks (owned by owner@acme.com)
    {
      title: 'Q1 Strategic Planning',
      description: 'Define Q1 objectives and key results for all regions',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      position: 0,
      ownerId: users['owner@acme.com'].id,
      organizationId: parentOrg.id,
    },
    {
      title: 'Annual Budget Review',
      description: 'Review and approve annual budget allocations',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      position: 1,
      ownerId: users['owner@acme.com'].id,
      organizationId: parentOrg.id,
    },
    // Child org tasks (owned by admin@east.acme.com)
    {
      title: 'East Region Sales Report',
      description: 'Compile monthly sales data for East region',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      position: 0,
      ownerId: users['admin@east.acme.com'].id,
      organizationId: childOrg.id,
    },
    {
      title: 'Team Building Event',
      description: 'Organize quarterly team event',
      status: TaskStatus.TODO,
      category: TaskCategory.PERSONAL,
      position: 1,
      ownerId: users['admin@east.acme.com'].id,
      organizationId: childOrg.id,
    },
  ];

  for (const taskData of tasksData) {
    const task = taskRepo.create(taskData);
    await taskRepo.save(task);
    console.log(`  Created: "${taskData.title}" (pos: ${taskData.position})`);
  }

  // --- Summary ---
  const orgCount = await orgRepo.count();
  const userCount = await userRepo.count();
  const taskCount = await taskRepo.count();

  console.log('\n========================================');
  console.log('           SEED COMPLETE');
  console.log('========================================');
  console.log(`Organizations: ${orgCount}`);
  console.log(`Users:         ${userCount}`);
  console.log(`Tasks:         ${taskCount}`);

  console.log('\n========================================');
  console.log('         DEMO CREDENTIALS');
  console.log('========================================');
  console.log('Password for all users: password123\n');
  console.log('Email                   Role     Organization');
  console.log('----------------------  -------  ----------------');
  console.log('owner@acme.com          OWNER    Acme Corp (parent)');
  console.log('admin@east.acme.com     ADMIN    Acme East (child)');
  console.log('viewer@east.acme.com    VIEWER   Acme East (child)');
  console.log('========================================\n');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
