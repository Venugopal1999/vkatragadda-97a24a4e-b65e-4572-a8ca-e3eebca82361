import { TaskCategory } from '../../entities';

export class CreateTaskDto {
  title: string;
  description?: string;
  category?: TaskCategory;
}
