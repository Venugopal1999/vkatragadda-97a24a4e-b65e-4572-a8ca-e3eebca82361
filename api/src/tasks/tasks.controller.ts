import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Role, Roles, RolesGuard, RequestUser } from '@turbovets-fullstack/auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.VIEWER)
  async findAll(@CurrentUser() user: RequestUser) {
    return this.tasksService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.VIEWER)
  async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const task = await this.tasksService.findOne(user, id);
    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }
    return task;
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  @Put(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(user, id, dto);
    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }
    return task;
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const deleted = await this.tasksService.delete(user, id);
    if (!deleted) {
      throw new NotFoundException('Task not found or access denied');
    }
    return { deleted: true };
  }
}
