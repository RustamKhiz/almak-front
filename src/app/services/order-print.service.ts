import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OrderPrintService {
  printHtml(html: string): void {
    const popup = window.open('', '_blank', 'width=1000,height=800');
    if (!popup) {
      return;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  }
}
