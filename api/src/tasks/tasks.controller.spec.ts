import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { Role, RolesGuard } from '@turbovets-fullstack/auth';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AuditController } from '../audit/audit.controller';
import { AuditService } from '../audit/audit.service';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { Reflector } from '@nestjs/core';

const TEST_SECRET = 'test-jwt-secret-for-unit-tests';
const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';
const TEST_TASK_ID = '00000000-0000-0000-0000-000000000099';

const STUB_TASK = {
  id: TEST_TASK_ID,
  title: 'Stub task',
  description: 'A stub task for testing',
  status: 'OPEN',
  category: 'GENERAL',
  organizationId: TEST_ORG_ID,
  ownerId: '00000000-0000-0000-0000-000000000010',
  position: 0,
};

describe('TasksController & AuditController (integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let tasksService: TasksService;
  let ownerToken: string;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET: TEST_SECRET })],
        }),
        PassportModule,
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [TasksController, AuditController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        Reflector,
        AuditInterceptor,
        {
          provide: TasksService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([STUB_TASK]),
            findOne: jest.fn().mockResolvedValue(STUB_TASK),
            create: jest.fn().mockResolvedValue({ ...STUB_TASK, id: 'new-id' }),
            update: jest.fn().mockResolvedValue({ ...STUB_TASK, title: 'Updated' }),
            delete: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    jwtService = module.get<JwtService>(JwtService);
    tasksService = module.get<TasksService>(TasksService);

    ownerToken = jwtService.sign({
      sub: '00000000-0000-0000-0000-000000000010',
      role: Role.OWNER,
      orgId: TEST_ORG_ID,
    });
    adminToken = jwtService.sign({
      sub: '00000000-0000-0000-0000-000000000020',
      role: Role.ADMIN,
      orgId: TEST_ORG_ID,
    });
    viewerToken = jwtService.sign({
      sub: '00000000-0000-0000-0000-000000000030',
      role: Role.VIEWER,
      orgId: TEST_ORG_ID,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Requirement 1: JWT required on /tasks (401) ───

  describe('Requirement 1: JWT required (401 without token)', () => {
    it('1 — GET /tasks without token → 401', () => {
      return request(app.getHttpServer()).get('/tasks').expect(401);
    });

    it('2 — POST /tasks without token → 401', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'Test' })
        .expect(401);
    });

    it('3 — PUT /tasks/:id without token → 401', () => {
      return request(app.getHttpServer())
        .put(`/tasks/${TEST_TASK_ID}`)
        .send({ title: 'Updated' })
        .expect(401);
    });

    it('4 — DELETE /tasks/:id without token → 401', () => {
      return request(app.getHttpServer())
        .delete(`/tasks/${TEST_TASK_ID}`)
        .expect(401);
    });
  });

  // ─── Requirement 2: Viewer blocked from POST/PUT/DELETE (403) ───

  describe('Requirement 2: Viewer RBAC (read-only)', () => {
    it('5 — GET /tasks with VIEWER token → 200', () => {
      return request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);
    });

    it('6 — POST /tasks with VIEWER token → 403', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: 'Test' })
        .expect(403);
    });

    it('7 — PUT /tasks/:id with VIEWER token → 403', () => {
      return request(app.getHttpServer())
        .put(`/tasks/${TEST_TASK_ID}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: 'Updated' })
        .expect(403);
    });

    it('8 — DELETE /tasks/:id with VIEWER token → 403', () => {
      return request(app.getHttpServer())
        .delete(`/tasks/${TEST_TASK_ID}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });
  });

  // ─── Requirement 3: Admin allowed within scope ───

  describe('Requirement 3: Admin allowed', () => {
    it('9 — GET /tasks with ADMIN token → 200', () => {
      return request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('10 — POST /tasks with ADMIN token → 201', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'New task' })
        .expect(201);
    });
  });

  // ─── Requirement 4: /audit-log blocked for Viewer (403) ───

  describe('Requirement 4: /audit-log RBAC', () => {
    it('11 — GET /audit-log with VIEWER token → 403', () => {
      return request(app.getHttpServer())
        .get('/audit-log')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('12 — GET /audit-log with ADMIN token → 200', () => {
      return request(app.getHttpServer())
        .get('/audit-log')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('13 — GET /audit-log with OWNER token → 200', () => {
      return request(app.getHttpServer())
        .get('/audit-log')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });
  });

  // ─── Requirement 5: Admin denied out of scope (403) ───

  describe('Requirement 5: Admin denied out of scope', () => {
    it('14 — GET /tasks/:id with ADMIN token → 403 when service denies cross-org access', () => {
      (tasksService.findOne as jest.Mock).mockRejectedValueOnce(
        new ForbiddenException('Access denied: org out of scope'),
      );
      return request(app.getHttpServer())
        .get(`/tasks/${TEST_TASK_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });
});
