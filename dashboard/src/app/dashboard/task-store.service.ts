import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, switchMap, tap, EMPTY } from 'rxjs';
import { TaskService } from './task.service';
import { Task, TaskStatus, TaskCategory } from './task.model';
import { moveItemInArray } from '@angular/cdk/drag-drop';

export interface TaskFilters {
  status: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  private readonly api = inject(TaskService);

  private readonly tasksSubject = new BehaviorSubject<Task[]>([]);
  private readonly filtersSubject = new BehaviorSubject<TaskFilters>({
    status: '',
    category: '',
  });
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  /** Observable streams for components to subscribe to */
  readonly tasks$ = this.tasksSubject.asObservable();
  readonly filters$ = this.filtersSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  /** Snapshot accessors */
  get tasks(): Task[] {
    return this.tasksSubject.value;
  }

  get filters(): TaskFilters {
    return this.filtersSubject.value;
  }

  /** Load tasks from API with current filters */
  load(): void {
    this.loadingSubject.next(true);
    const f = this.filtersSubject.value;
    const filters: { status?: TaskStatus; category?: TaskCategory } = {};
    if (f.status) filters.status = f.status as TaskStatus;
    if (f.category) filters.category = f.category as TaskCategory;

    this.api.findAll(filters).subscribe((tasks) => {
      this.tasksSubject.next(tasks);
      this.loadingSubject.next(false);
    });
  }

  /** Update filters and reload */
  setFilters(patch: Partial<TaskFilters>): void {
    this.filtersSubject.next({ ...this.filtersSubject.value, ...patch });
    this.load();
  }

  /** Create a task, then reload the list */
  create(data: { title: string; description?: string; category?: TaskCategory }) {
    return this.api.create(data).pipe(tap(() => this.load()));
  }

  /** Update a task, then reload the list */
  update(
    id: string,
    data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'category' | 'position'>>,
  ) {
    return this.api.update(id, data).pipe(tap(() => this.load()));
  }

  /** Delete a task, then reload the list */
  delete(id: string) {
    return this.api.delete(id).pipe(tap(() => this.load()));
  }

  /** Optimistic reorder: update local list immediately, persist to API */
  reorder(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) return;

    const list = [...this.tasksSubject.value];
    moveItemInArray(list, previousIndex, currentIndex);
    this.tasksSubject.next(list);

    const moved = list[currentIndex];
    this.api.update(moved.id, { position: currentIndex }).subscribe();
  }
}
