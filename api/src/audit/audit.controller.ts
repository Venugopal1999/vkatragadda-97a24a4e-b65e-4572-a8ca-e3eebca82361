import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role, Roles, RolesGuard, RequestUser } from '@turbovets-fullstack/auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.ADMIN)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100;
    return this.auditService.findAll(user, parsedLimit);
  }
}
