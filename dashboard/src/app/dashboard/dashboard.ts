import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TaskStoreService } from './task-store.service';
import { Task, TaskStatus, TaskCategory } from './task.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CdkDropList, CdkDrag],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(TaskStoreService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  tasks: Task[] = [];
  statusFilter = '';
  categoryFilter = '';

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
    this.sub = this.store.tasks$.subscribe((t) => {
      this.tasks = t;
      this.cdr.detectChanges();
    });
    const f = this.store.filters;
    this.statusFilter = f.status;
    this.categoryFilter = f.category;
    this.store.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onStatusChange(value: string): void {
    this.statusFilter = value;
    this.store.setFilters({ status: value });
  }

  onCategoryChange(value: string): void {
    this.categoryFilter = value;
    this.store.setFilters({ category: value });
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

    const done = () => {
      this.closeModal();
      this.saving.set(false);
    };

    if (editing) {
      this.store
        .update(editing.id, {
          title: raw.title,
          description: raw.description || undefined,
          category: (raw.category as TaskCategory) || undefined,
          status: raw.status as TaskStatus,
        })
        .subscribe({ next: done, error: () => this.saving.set(false) });
    } else {
      this.store
        .create({
          title: raw.title,
          description: raw.description || undefined,
          category: (raw.category as TaskCategory) || undefined,
        })
        .subscribe({ next: done, error: () => this.saving.set(false) });
    }
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete "${task.title}"?`)) return;
    this.store.delete(task.id).subscribe();
  }

  onDrop(event: CdkDragDrop<Task[]>): void {
    this.store.reorder(event.previousIndex, event.currentIndex);
  }
}
