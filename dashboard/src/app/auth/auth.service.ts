import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

const TOKEN_KEY = 'accessToken';

interface LoginResponse {
  accessToken: string;
}

interface JwtPayload {
  sub: string;
  role: string;
  orgId: string;
}

function decodePayload(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly token = signal<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );

  readonly isLoggedIn = computed(() => this.token() !== null);

  readonly userRole = computed(() => {
    const t = this.token();
    if (!t) return null;
    return decodePayload(t)?.role ?? null;
  });

  readonly canEdit = computed(() => {
    const role = this.userRole();
    return role === 'OWNER' || role === 'ADMIN';
  });

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
