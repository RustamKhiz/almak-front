import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AI_SCHEMA, AiField, AiItem, AiValue } from '../../../ai-orders/ai-order.types';
import { DraggableDialogTitleComponent } from '../../../common/dialogs/draggable-dialog-title/draggable-dialog-title.component';
import { draftValueLabel } from '../order-draft-item';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { CatalogsService } from '../../../services/catalogs.service';
import { CATALOG_KEYS, CatalogKey } from '../../../common/constants/catalog-keys';
import { CatalogAutocompleteFieldComponent } from '../../../ui/catalog-autocomplete-field/catalog-autocomplete-field.component';
import { bindLockAccessories } from '../../../common/utils/hardware-defaults';

export interface OrderDraftItemDialogData {
  item: AiItem;
  title: string;
}

// Draft products use the same list and actions as saved products, but their
// editor must retain unknown fields instead of applying the strict dialogs' defaults.
@Component({
  selector: 'app-order-draft-item-dialog',
  imports: [
    DraggableDialogTitleComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    CatalogAutocompleteFieldComponent,
  ],
  templateUrl: './order-draft-item-dialog.component.html',
  styleUrl: './order-draft-item-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDraftItemDialogComponent {
  protected readonly data = inject<OrderDraftItemDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<OrderDraftItemDialogComponent, Record<string, AiValue>>);
  protected readonly fields = Object.entries(AI_SCHEMA.items[this.data.item.type].fields);
  private readonly catalogs = inject(CatalogsService);
  private readonly coveringKeys: Partial<Record<string, CatalogKey>> = {
    interiorDoor: CATALOG_KEYS.interiorDoorCoverings,
    molding: CATALOG_KEYS.moldingCoverings,
    extension: CATALOG_KEYS.extensionCoverings,
    capital: CATALOG_KEYS.capitalCoverings,
    paneling: CATALOG_KEYS.panelingCoverings,
  };
  protected readonly suppliers = toSignal(this.catalogs.getItemsByKey(CATALOG_KEYS.suppliers, []), {
    initialValue: [],
  });
  protected readonly coverings = toSignal(
    this.coveringKeys[this.data.item.type]
      ? this.catalogs.getItemsByKey(this.coveringKeys[this.data.item.type]!, [])
      : of([]),
    { initialValue: [] },
  );
  protected readonly valueLabel = draftValueLabel;
  protected readonly form = new FormGroup(
    Object.fromEntries(
      this.fields.map(([key, field]) => [
        key,
        new FormControl<AiValue>(this.data.item.fields[key] ?? null, {
          validators: field.type === 'number' ? [Validators.min(field.min ?? 0), Validators.max(field.max ?? 1e9)] : [],
        }),
      ]),
    ),
  );
  constructor() {
    const destroyRef = inject(DestroyRef);
    if (this.data.item.type === 'hardware') bindLockAccessories(this.form.controls, destroyRef, true);
  }

  protected visible(key: string): boolean {
    const value = this.form.getRawValue();
    if (['width2', 'height2', 'price2', 'count2'].includes(key))
      return value['leafType'] === 'Double' || value[key] != null;
    if (key === 'glassComment') return value['hasGlass'] === true || !!value[key];
    return true;
  }

  protected label(field: AiField): string {
    return field.label;
  }

  protected save(): void {
    if (this.form.invalid) return;
    const fields = this.form.getRawValue();
    for (const [key, def] of this.fields) {
      const value = fields[key];
      if (typeof value === 'number' && def.integer && !Number.isInteger(value)) {
        this.form.controls[key].setErrors({ integer: true });
        return;
      }
      if (typeof value === 'string') fields[key] = value.trim() || null;
    }
    this.ref.close(fields);
  }
}
