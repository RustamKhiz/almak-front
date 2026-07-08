import { Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({
  selector: '[appNumberInputNoWheel]',
  standalone: true,
})
export class NumberInputNoWheelDirective {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);

  @HostListener('wheel', ['$event'])
  protected onWheel(event: WheelEvent): void {
    if (document.activeElement !== this.elementRef.nativeElement) {
      return;
    }

    event.preventDefault();
  }
}
