import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiOrdersService } from './ai-orders.service';
import { AI_SCHEMA, AiField, AiValue, aiIssues, aiKnownAmount } from './ai-order.types';

@Component({
  selector: 'app-ai-draft-card',
  imports: [FormsModule],
  templateUrl: './ai-draft-card.component.html',
  styleUrl: './ai-draft-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiDraftCardComponent {
  protected readonly controlPrefix = 'ai-' + crypto.randomUUID();
  readonly draftId = input.required<string>();
  readonly readonly = input(false);
  protected readonly ai = inject(AiOrdersService);
  protected readonly schema = AI_SCHEMA;
  protected readonly definitions = Object.entries(AI_SCHEMA.items);
  protected readonly draft = computed(() => this.ai.drafts().find((d) => d.id === this.draftId()));
  protected readonly amount = computed(() => (this.draft() ? aiKnownAmount(this.draft()!.order) : null));
  protected readonly issues = computed(() => (this.draft() ? aiIssues(this.draft()!.order) : []));
  protected entries(fields: Record<string, AiField>): [string, AiField][] {
    return Object.entries(fields);
  }
  protected change(path: string, raw: string, field: AiField): void {
    if (this.readonly()) return;
    let value: AiValue =
      raw === '' ? null : field.type === 'number' ? Number(raw) : field.type === 'boolean' ? raw === 'true' : raw;
    if (path === 'header.phone' && typeof value === 'string') {
      value = value.replace(/\D/g, '');
      if (/^8\d{10}$/.test(value)) value = '7' + value.slice(1);
    }
    this.ai.manual(path, value, this.draftId());
  }
  protected add(type: string): void {
    this.ai.addItem(type, this.draftId());
  }
  protected remove(id: string): void {
    this.ai.deleteItem(id, this.draftId());
  }
  protected today(): void {
    const now = new Date();
    this.ai.manual(
      'header.date',
      new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(now),
      this.draftId(),
    );
  }
}
