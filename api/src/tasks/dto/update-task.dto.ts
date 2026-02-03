import { TaskStatus, TaskCategory } from '../../entities';

export class UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  category?: TaskCategory;
  position?: number;
}
