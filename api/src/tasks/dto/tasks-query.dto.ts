import { IsOptional, IsEnum } from 'class-validator';
import { TaskStatus, TaskCategory } from '../../entities';

export class TasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;
}
