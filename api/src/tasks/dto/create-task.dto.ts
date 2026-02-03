import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { TaskCategory } from '../../entities';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;
}
