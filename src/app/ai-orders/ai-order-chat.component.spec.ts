import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AiOrderChatComponent } from './ai-order-chat.component';
import { AiOrdersService } from './ai-orders.service';

describe('Floating AI chat', () => {
  afterEach(() => localStorage.removeItem('ai_order_drafts_v1'));
  it('opens the actual card element rather than the Angular component instance', async () => {
    localStorage.removeItem('ai_order_drafts_v1');
    await TestBed.configureTestingModule({
      imports: [AiOrderChatComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { authenticated: signal(true) } },
      ],
    }).compileComponents();
    const ai = TestBed.inject(AiOrdersService);
    const draft = ai.create('Тест')!;
    ai.update(draft.id, (d) => {
      d.messages.push({ role: 'user', text: 'Тест', createdAt: new Date().toISOString() });
    });
    ai.open(draft.id);
    const fixture = TestBed.createComponent(AiOrderChatComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const scroll = spyOn(HTMLElement.prototype, 'scrollIntoView');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.draft-link button');
    expect(button).toBeTruthy();
    button.click();
    expect(scroll).toHaveBeenCalled();
    fixture.destroy();
    expect(ai.busy()).toBeFalse();
  });
});
