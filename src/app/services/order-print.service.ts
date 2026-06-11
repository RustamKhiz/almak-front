import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OrderPrintService {
  private get isElectron(): boolean {
    return navigator.userAgent.includes('Electron');
  }

  printHtml(html: string): void {
    const popup = window.open('', '_blank', 'width=1000,height=800');
    if (!popup) {
      return;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();

    if (this.isElectron) {
      popup.focus();
      return;
    }

    const print = () => {
      popup.focus();
      popup.print();
    };

    const images = Array.from(popup.document.images);
    if (!images.length) {
      popup.setTimeout(print, 100);
      return;
    }

    let settledCount = 0;
    const markSettled = () => {
      settledCount += 1;
      if (settledCount === images.length) {
        popup.setTimeout(print, 100);
      }
    };

    images.forEach((image) => {
      if (image.complete) {
        markSettled();
        return;
      }

      image.addEventListener('load', markSettled, { once: true });
      image.addEventListener('error', markSettled, { once: true });
    });
  }
}
