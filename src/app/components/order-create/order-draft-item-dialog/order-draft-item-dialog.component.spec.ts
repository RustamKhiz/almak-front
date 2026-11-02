import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CatalogsService } from '../../../services/catalogs.service';
import { OrderDraftItemDialogComponent } from './order-draft-item-dialog.component';

describe('Partial product editor', () => {
  async function open() {
    const ref = { close: jasmine.createSpy('close') };
    await TestBed.configureTestingModule({
      imports: [OrderDraftItemDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Редактировать дверь',
            item: { itemId: 'door', type: 'interiorDoor', fields: { model: 'Верона' } },
          },
        },
        { provide: MatDialogRef, useValue: ref },
        { provide: CatalogsService, useValue: { getItemsByKey: () => of(['Эмаль']) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(OrderDraftItemDialogComponent);
    fixture.detectChanges();
    return { fixture, ref };
  }

  it('saves a model-only product without inventing size, price, count, covering or glass', async () => {
    const { fixture, ref } = await open();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-flat-button]');
    expect(button.disabled).toBeFalse();
    button.click();
    const fields = ref.close.calls.mostRecent().args[0];
    expect(fields.model).toBe('Верона');
    for (const key of ['width', 'height', 'price', 'count', 'covering', 'leafType', 'hasGlass'])
      expect(fields[key]).toBeNull();
  });

  it('accepts a partial price change but rejects negative prices', async () => {
    const { fixture, ref } = await open();
    const field = Array.from(fixture.nativeElement.querySelectorAll('mat-form-field') as NodeListOf<HTMLElement>).find(
      (element) => element.querySelector('mat-label')?.textContent?.trim() === 'Цена, ₽',
    )!;
    const price = field.querySelector('input')!;
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-flat-button]');
    price.value = '-1';
    price.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
    expect(ref.close).not.toHaveBeenCalled();
    price.value = '12000';
    price.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button.click();
    expect(ref.close.calls.mostRecent().args[0].price).toBe(12000);
    expect(ref.close.calls.mostRecent().args[0].width).toBeNull();
  });
});
