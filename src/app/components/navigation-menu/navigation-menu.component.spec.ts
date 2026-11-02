import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DesktopUpdateState, NavigationMenuComponent } from './navigation-menu.component';

describe('Desktop update controls', () => {
  let fixture: ComponentFixture<NavigationMenuComponent>;
  let listener: (state: DesktopUpdateState) => void;
  let check: jasmine.Spy;
  let install: jasmine.Spy;
  let unsubscribe: jasmine.Spy;
  const original = window.almakDesktop;

  beforeEach(async () => {
    check = jasmine.createSpy('check').and.resolveTo({ status: 'current', revision: 1 });
    install = jasmine.createSpy('install');
    unsubscribe = jasmine.createSpy('unsubscribe');
    window.almakDesktop = {
      platform: 'win32',
      version: '1.3.2',
      getUpdateState: () => Promise.resolve({ status: 'idle', revision: 0 }),
      checkForUpdates: check,
      onUpdateState: (callback) => {
        listener = callback;
        return unsubscribe;
      },
      installUpdate: install,
    };
    await TestBed.configureTestingModule({
      imports: [NavigationMenuComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });
  afterEach(() => {
    fixture?.destroy();
    window.almakDesktop = original;
  });
  async function open() {
    fixture = TestBed.createComponent(NavigationMenuComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('checks on demand and displays the current-version result', async () => {
    await open();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Проверить обновление');
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(check).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Установлена последняя версия');
  });
  it('shows download progress and replaces the check action with install when ready', async () => {
    await open();
    listener({ status: 'downloading', percent: 42, revision: 2 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('42%');
    expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
    listener({ status: 'ready', revision: 3 });
    listener({ status: 'idle', revision: 0 });
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Установить обновление');
    button.click();
    expect(install).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('restores the install button when the update downloaded before the menu opened', async () => {
    window.almakDesktop!.getUpdateState = () => Promise.resolve({ status: 'ready', revision: 5 });
    await open();
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Установить обновление');
  });
  it('allows retry after IPC failure and keeps desktop controls out of the web app', async () => {
    check.and.rejectWith(new Error('IPC unavailable'));
    await open();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Попробуйте ещё раз');
    expect(fixture.nativeElement.querySelector('button').disabled).toBeFalse();
    fixture.destroy();
    delete window.almakDesktop;
    await open();
    expect(fixture.nativeElement.textContent).not.toContain('Проверить обновление');
  });
});
