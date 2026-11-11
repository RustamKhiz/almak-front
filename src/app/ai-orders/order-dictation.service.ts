import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { CoreService } from '../services/core.service';

@Injectable()
export class OrderDictationService {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);
  private readonly url = `${inject(CoreService).apiBaseUrl}/ai/order-drafts/transcribe`;
  private readonly mimeType =
    typeof MediaRecorder === 'undefined'
      ? undefined
      : ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((type) =>
          MediaRecorder.isTypeSupported(type),
        );
  readonly supported = !!this.mimeType && !!navigator.mediaDevices?.getUserMedia;
  readonly phase = signal<'starting' | 'recording' | 'transcribing' | null>(null);
  readonly error = signal('');
  readonly level = signal<number | null>(null);
  readonly elapsedSeconds = signal(0);
  private generation = 0;
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private timer?: ReturnType<typeof setTimeout>;
  private elapsedTimer?: ReturnType<typeof setInterval>;
  private request?: Subscription;
  private audioContext?: AudioContext;
  private levelFrame?: number;

  async start(append: (text: string) => void): Promise<void> {
    if (!this.supported || this.phase()) return;
    const generation = ++this.generation;
    this.error.set('');
    this.phase.set('starting');
    try {
      const { enabled } = await firstValueFrom(this.http.get<{ enabled: boolean }>(this.url, { timeout: 8000 }));
      if (generation !== this.generation) return;
      if (!enabled) {
        this.fail('Голосовой ввод пока не подключён.');
        return;
      }
    } catch {
      if (generation === this.generation) this.fail('Не удалось подключиться к голосовому вводу.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      const recorder = new MediaRecorder(stream, { mimeType: this.mimeType, audioBitsPerSecond: 48_000 });
      this.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (generation !== this.generation) return;
        this.releaseMicrophone();
        const audio = new Blob(chunks, { type: recorder.mimeType });
        if (!audio.size) {
          this.fail('Запись пуста. Попробуйте ещё раз.');
          return;
        }
        this.phase.set('transcribing');
        this.request = this.http.post<{ text: string }>(this.url, audio).subscribe({
          next: ({ text }) => {
            if (generation !== this.generation) return;
            this.phase.set(null);
            append(text);
          },
          error: (error: HttpErrorResponse) => {
            if (generation !== this.generation) return;
            this.fail(error.error?.message || 'Не удалось распознать запись. Попробуйте ещё раз.');
          },
        });
      };
      recorder.onerror = () => {
        if (generation === this.generation) this.fail('Не удалось записать звук. Попробуйте ещё раз.');
      };
      recorder.start();
      const startedAt = Date.now();
      this.phase.set('recording');
      this.startLevelMeter(stream);
      this.timer = setTimeout(() => this.stop(), 60_000);
      this.elapsedTimer = setInterval(() => {
        this.elapsedSeconds.set(Math.min(59, Math.floor((Date.now() - startedAt) / 1000)));
      }, 1000);
    } catch (error) {
      if (generation !== this.generation) return;
      this.fail(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Разрешите доступ к микрофону для голосового ввода.'
          : 'Не удалось включить микрофон. Проверьте подключение.',
      );
    }
  }

  stop(): void {
    if (this.recorder?.state !== 'recording') return;
    this.stopRecordingTimers();
    this.phase.set('transcribing');
    this.stopLevelMeter();
    this.recorder.stop();
  }

  cancel(): void {
    this.generation++;
    this.request?.unsubscribe();
    this.request = undefined;
    if (this.recorder) {
      this.recorder.onstop = null;
      this.recorder.ondataavailable = null;
      this.recorder.onerror = null;
      if (this.recorder.state !== 'inactive') this.recorder.stop();
    }
    this.releaseMicrophone();
    this.phase.set(null);
    this.error.set('');
  }

  private releaseMicrophone(): void {
    this.stopRecordingTimers();
    this.stopLevelMeter();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    this.recorder = undefined;
  }

  private stopRecordingTimers(): void {
    clearTimeout(this.timer);
    clearInterval(this.elapsedTimer);
    this.elapsedSeconds.set(0);
  }

  private startLevelMeter(stream: MediaStream): void {
    try {
      const context = new AudioContext();
      this.audioContext = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      this.level.set(0);
      void context.resume().catch(() => {
        if (this.audioContext === context) this.stopLevelMeter();
      });
      this.zone.runOutsideAngular(() => {
        let lastSample = -Infinity;
        const sample = (timestamp: number) => {
          if (timestamp - lastSample >= 32) {
            analyser.getFloatTimeDomainData(samples);
            let energy = 0;
            for (const value of samples) energy += value * value;
            const rms = Math.sqrt(energy / samples.length);
            const level = Math.max(0, Math.min(1, (rms - 0.008) * 12));
            this.level.set(Math.round(level * 40) / 40);
            lastSample = timestamp;
          }
          this.levelFrame = requestAnimationFrame(sample);
        };
        this.levelFrame = requestAnimationFrame(sample);
      });
    } catch {
      this.stopLevelMeter();
    }
  }

  private stopLevelMeter(): void {
    if (this.levelFrame !== undefined) cancelAnimationFrame(this.levelFrame);
    this.levelFrame = undefined;
    if (this.audioContext) void this.audioContext.close().catch(() => undefined);
    this.audioContext = undefined;
    this.level.set(null);
  }

  private fail(message: string): void {
    this.cancel();
    this.error.set(message);
  }
}
