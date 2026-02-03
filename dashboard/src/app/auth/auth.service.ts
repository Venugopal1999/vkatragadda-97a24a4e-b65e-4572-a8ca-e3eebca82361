import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

const TOKEN_KEY = 'accessToken';

interface LoginResponse {
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly token = signal<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );

  readonly isLoggedIn = computed(() => this.token() !== null);

  getToken(): string | null {
    return this.token();
  }

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>('/api/auth/login', { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          this.token.set(res.accessToken);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.router.navigate(['/login']);
  }
}
