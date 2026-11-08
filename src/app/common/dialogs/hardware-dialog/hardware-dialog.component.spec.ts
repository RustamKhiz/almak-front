import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CatalogsService } from '../../../services/catalogs.service';
import { HardwareDialogComponent } from './hardware-dialog.component';

describe('Hardware lock accessories', () => {
  it('follows lock quantity until manually overridden and preserves zero when saving', async () => {
    const close = jasmine.createSpy('close');
    await TestBed.configureTestingModule({
      imports: [HardwareDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'create' } },
        { provide: MatDialogRef, useValue: { close } },
        { provide: CatalogsService, useValue: { getItemsByKey: () => of([]) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(HardwareDialogComponent);
    fixture.detectChanges();
    const input = (key: string): HTMLInputElement => fixture.nativeElement.querySelector(`[formControlName="${key}"]`);
    const enter = (key: string, value: string) => {
      input(key).value = value;
      input(key).dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    };
    enter('lockCount', '3');
    expect(input('cylinderCount').value).toBe('3');
    expect(input('escutcheonCount').value).toBe('3');
    enter('cylinderCount', '0');
    enter('lockCount', '4');
    expect(input('cylinderCount').value).toBe('0');
    expect(input('escutcheonCount').value).toBe('4');
    enter('escutcheonCount', '0');
    const save = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.trim() === 'Сохранить',
    )!;
    save.click();
    expect(close.calls.mostRecent().args[0].cylinderCount).toBe(0);
    expect(close.calls.mostRecent().args[0].escutcheonCount).toBe(0);
    fixture.destroy();
  });
});
