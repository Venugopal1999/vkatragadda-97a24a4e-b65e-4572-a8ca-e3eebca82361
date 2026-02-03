import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'TurboVets';
  protected readonly auth = inject(AuthService);
}
