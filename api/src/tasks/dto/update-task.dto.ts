import { IsString, IsOptional, IsEnum, IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { TaskStatus, TaskCategory } from '../../entities';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
