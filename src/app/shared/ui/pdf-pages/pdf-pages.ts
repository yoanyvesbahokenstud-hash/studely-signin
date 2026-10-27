import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { PDFDocumentLoadingTask } from 'pdfjs-dist';
import { Icon } from '../icon/icon';
import { loadPdfjs } from './pdfjs';

export interface PdfSource {
  title: string;
  url: string;
}

/**
 * Affiche des PDF à la suite, page par page (pdf.js), à la largeur du conteneur.
 * Le défilement appartient au parent : ce composant ne fait que dessiner les pages,
 * puis émet `rendered` quand tout est affiché (la hauteur finale est alors connue).
 * Les URL doivent être lisibles en CORS par le navigateur.
 */
@Component({
  selector: 'sts-pdf-pages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (loading()) {
      <p class="status"><sts-icon name="loader" class="spin" /> Chargement du document…</p>
    }
    <div #pages class="pages"></div>
  `,
  styles: `
    :host {
      display: block;
    }
    .status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      color: var(--text-muted);
      padding: var(--space-5);
    }
    .pages {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .pages ::ng-deep h3 {
      margin: var(--space-3) 0 0;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .pages ::ng-deep canvas {
      display: block;
      width: 100%;
      height: auto;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
    }
  `,
})
export class PdfPages {
  readonly sources = input.required<PdfSource[]>();
  readonly rendered = output<void>();
  readonly failed = output<unknown>();

  protected readonly loading = signal(true);
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('pages');
  private readonly tasks: PDFDocumentLoadingTask[] = [];
  private run = 0;

  constructor() {
    effect(() => {
      const sources = this.sources();
      const host = this.container().nativeElement;
      untracked(() => void this.render(sources, host));
    });
    inject(DestroyRef).onDestroy(() => {
      this.run++;
      this.release();
    });
  }

  private async render(sources: PdfSource[], host: HTMLElement): Promise<void> {
    const run = ++this.run;
    this.release();
    host.replaceChildren();
    this.loading.set(true);
    try {
      const pdfjs = await loadPdfjs();
      const width = host.clientWidth || 800;
      const ratio = window.devicePixelRatio || 1;

      for (const source of sources) {
        const task = pdfjs.getDocument({ url: source.url });
        this.tasks.push(task);
        const pdf = await task.promise;
        if (run !== this.run) return;
        if (sources.length > 1) {
          const title = document.createElement('h3');
          title.textContent = source.title;
          host.append(title);
        }
        for (let number = 1; number <= pdf.numPages; number++) {
          const page = await pdf.getPage(number);
          const viewport = page.getViewport({
            scale: (width / page.getViewport({ scale: 1 }).width) * ratio,
          });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.setAttribute('aria-label', `${source.title}, page ${number} sur ${pdf.numPages}`);
          host.append(canvas);
          await page.render({ canvas, viewport }).promise;
          if (run !== this.run) return;
        }
      }
      this.loading.set(false);
      this.rendered.emit();
    } catch (error) {
      if (run !== this.run) return;
      this.loading.set(false);
      this.failed.emit(error);
    }
  }

  private release(): void {
    this.tasks.splice(0).forEach((task) => void task.destroy());
  }
}
