import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService } from '../auth/auth.service';
import { TaskService } from './task.service';
import { Task, TaskStatus, TaskCategory } from './task.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CdkDropList, CdkDrag],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly fb = inject(FormBuilder);

  readonly tasks = signal<Task[]>([]);
  readonly statusFilter = signal('');
  readonly categoryFilter = signal('');
  readonly modalOpen = signal(false);
  readonly editingTask = signal<Task | null>(null);
  readonly saving = signal(false);

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    category: [''],
    status: ['TODO'],
  });

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    const filters: { status?: TaskStatus; category?: TaskCategory } = {};
    const s = this.statusFilter();
    const c = this.categoryFilter();
    if (s) filters.status = s as TaskStatus;
    if (c) filters.category = c as TaskCategory;

    this.taskService.findAll(filters).subscribe((tasks) => this.tasks.set(tasks));
  }

  openModal(task?: Task): void {
    this.editingTask.set(task ?? null);
    if (task) {
      this.form.setValue({
        title: task.title,
        description: task.description ?? '',
        category: task.category ?? '',
        status: task.status,
      });
    } else {
      this.form.reset({ title: '', description: '', category: '', status: 'TODO' });
    }
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingTask.set(null);
  }

  saveTask(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const editing = this.editingTask();

    if (editing) {
      this.taskService
        .update(editing.id, {
          title: raw.title,
          description: raw.description || undefined,
          category: (raw.category as TaskCategory) || undefined,
          status: raw.status as TaskStatus,
        })
        .subscribe({
          next: () => { this.closeModal(); this.loadTasks(); this.saving.set(false); },
          error: () => this.saving.set(false),
        });
    } else {
      this.taskService
        .create({
          title: raw.title,
          description: raw.description || undefined,
          category: (raw.category as TaskCategory) || undefined,
        })
        .subscribe({
          next: () => { this.closeModal(); this.loadTasks(); this.saving.set(false); },
          error: () => this.saving.set(false),
        });
    }
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete "${task.title}"?`)) return;
    this.taskService.delete(task.id).subscribe(() => this.loadTasks());
  }

  onDrop(event: CdkDragDrop<Task[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const list = [...this.tasks()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.tasks.set(list);

    // Persist new position to the API
    const moved = list[event.currentIndex];
    this.taskService.update(moved.id, { position: event.currentIndex }).subscribe();
  }
}
