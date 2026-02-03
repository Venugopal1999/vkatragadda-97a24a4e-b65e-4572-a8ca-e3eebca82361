import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role, Roles, RolesGuard, RequestUser } from '@turbovets-fullstack/auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksQueryDto } from './dto/tasks-query.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.ADMIN, Role.VIEWER)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: TasksQueryDto,
  ) {
    return this.tasksService.findAll(user, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.ADMIN, Role.VIEWER)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const task = await this.tasksService.findOne(user, id);
    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }
    return task;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.OWNER, Role.ADMIN)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.ADMIN)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(user, id, dto);
    if (!task) {
      throw new NotFoundException('Task not found or access denied');
    }
    return task;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.OWNER, Role.ADMIN)
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const deleted = await this.tasksService.delete(user, id);
    if (!deleted) {
      throw new NotFoundException('Task not found or access denied');
    }
  }
}
