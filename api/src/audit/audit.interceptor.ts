import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuditService } from './audit.service';
import { AuditAction } from '../entities';
import { RequestUser } from '@turbovets-fullstack/auth';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    const method = request.method;
    const path = request.route?.path ?? request.url;
    const resourceId = request.params?.id ?? null;

    // Determine resource from path
    const resource = this.extractResource(path);

    // Map HTTP method to audit action
    const action = this.mapMethodToAction(method);

    // Get IP address
    const ipAddress = request.ip || request.connection?.remoteAddress;

    return next.handle().pipe(
      tap(() => {
        // Success - request was allowed
        this.auditService.log({
          user: user ?? null,
          action,
          resource,
          resourceId,
          allowed: true,
          ipAddress,
        });
      }),
      catchError((error) => {
        // Determine if denied (403) or other error
        const statusCode = error.status || error.statusCode || 500;
        const allowed = statusCode < 400;

        this.auditService.log({
          user: user ?? null,
          action,
          resource,
          resourceId,
          allowed,
          ipAddress,
        });

        return throwError(() => error);
      }),
    );
  }

  private extractResource(path: string): string {
    // Extract resource name from path like /api/tasks/:id -> tasks
    const segments = path.split('/').filter(Boolean);
    // Skip 'api' prefix if present
    const resourceIndex = segments[0] === 'api' ? 1 : 0;
    return segments[resourceIndex] || 'unknown';
  }

  private mapMethodToAction(method: string): AuditAction {
    switch (method.toUpperCase()) {
      case 'POST':
        return AuditAction.CREATE;
      case 'GET':
        return AuditAction.READ;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.READ;
    }
  }
}
