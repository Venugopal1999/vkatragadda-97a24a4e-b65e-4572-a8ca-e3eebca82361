import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization, User, Task, AuditLog } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_NAME || 'taskdb.sqlite',
      entities: [Organization, User, Task, AuditLog],
      synchronize: true, // Auto-create tables in dev (disable in production)
      logging: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([Organization, User, Task, AuditLog]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
