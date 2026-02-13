import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  protected readonly authError = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.group({
    login: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (this.authService.hasToken()) {
      void this.router.navigateByUrl('/orders');
    }
  }

  protected onSubmitClick(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authError.set(null);
    this.isSubmitting.set(true);
    const value = this.form.getRawValue();
    this.authService
      .login({
        login: value.login ?? '',
        password: value.password ?? '',
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          void this.router.navigateByUrl('/orders');
        },
        error: () => {
          this.isSubmitting.set(false);
          this.authError.set('Неверный логин или пароль');
        },
      });
  }
}
