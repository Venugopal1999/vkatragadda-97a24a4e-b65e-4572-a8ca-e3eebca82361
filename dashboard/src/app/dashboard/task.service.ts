import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Task, TaskStatus, TaskCategory } from './task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/tasks';

  findAll(filters?: { status?: TaskStatus; category?: TaskCategory }) {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.category) params = params.set('category', filters.category);
    return this.http.get<Task[]>(this.base, { params });
  }

  create(data: { title: string; description?: string; category?: TaskCategory }) {
    return this.http.post<Task>(this.base, data);
  }

  update(id: string, data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'category' | 'position'>>) {
    return this.http.put<Task>(`${this.base}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
