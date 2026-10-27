import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import type { PageViewport, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { Icon } from '../icon/icon';

/** Rectangle en points PDF, origine en bas à gauche de la page (repère du backend). */
export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** `selected` : mis en avant · `assigned` : attribué · `free` : libre (pointillés) · `muted` : estompé. */
export type PdfMarkStyle = 'selected' | 'assigned' | 'free' | 'muted';

export interface PdfMark {
  rect: PdfRect;
  label: string;
  /** Couleur CSS du cadre : la page PDF reste blanche, quel que soit le thème. */
  color: string;
  style: PdfMarkStyle;
}

/** Zone en pixels de la page à l'échelle 1, origine en haut à gauche (repère du canvas). */
interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Texte gardé autour de la zone cadrée, en points : assez pour lire « Lu et approuvé… ». */
const FOCUS_MARGIN_X = 150;
const FOCUS_MARGIN_Y = 70;

/**
 * Dessine une page d'un PDF (pdf.js), ou seulement la zone autour de `focus`, avec des cadres
 * superposés. Seule la partie visible est rendue : c'est une « capture » faite dans le navigateur.
 * Le rendu attend que le composant soit visible à l'écran.
 */
@Component({
  selector: 'sts-pdf-region',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div
      class="frame"
      role="img"
      [attr.aria-label]="label()"
      [style.aspect-ratio]="aspectRatio()"
    >
      <canvas #canvas></canvas>
      @for (mark of placedMarks(); track $index) {
        <div
          [class]="'mark ' + mark.style"
          [style.left.%]="mark.left"
          [style.top.%]="mark.top"
          [style.width.%]="mark.width"
          [style.height.%]="mark.height"
          [style.--mark-color]="mark.color"
        >
          @if (mark.label) {
            <span class="mark-label">{{ mark.label }}</span>
          }
        </div>
      }
      @if (loading()) {
        <span class="status"><sts-icon name="loader" class="spin" /></span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .frame {
      position: relative;
      overflow: hidden;
      min-height: 60px;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }
    canvas {
      display: block;
      width: 100%;
      height: auto;
    }
    .mark {
      position: absolute;
      box-sizing: border-box;
      border: 2px solid var(--mark-color);
      border-radius: 4px;
      background: color-mix(in srgb, var(--mark-color) 12%, transparent);
    }
    .mark.free {
      border-style: dashed;
      background: transparent;
    }
    .mark.muted {
      opacity: 0.45;
    }
    .mark.selected {
      background: color-mix(in srgb, var(--mark-color) 20%, transparent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--mark-color) 30%, transparent);
    }
    .mark-label {
      position: absolute;
      top: 0;
      left: 0;
      max-width: 100%;
      overflow: hidden;
      padding: 1px 5px;
      border-bottom-right-radius: 3px;
      background: var(--mark-color);
      color: #fff;
      font-size: 0.68rem;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .mark.free .mark-label {
      background: #fff;
      color: var(--mark-color);
    }
    .status {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #7f8c9b;
    }
  `,
})
export class PdfRegion {
  readonly document = input.required<Promise<PDFDocumentProxy>>();
  /** Numéro de page, à partir de 1. */
  readonly page = input.required<number>();
  /** Zone à cadrer (avec un peu de texte autour) ; toute la page si absent. */
  readonly focus = input<PdfRect | null>(null);
  readonly marks = input<PdfMark[]>([]);
  readonly label = input('');
  readonly failed = output<unknown>();

  protected readonly loading = signal(true);
  private readonly geometry = signal<{ viewport: PageViewport; region: Box } | null>(null);
  private readonly visible = signal(false);

  protected readonly aspectRatio = computed(() => {
    const region = this.geometry()?.region;
    return region ? `${region.width} / ${region.height}` : null;
  });

  protected readonly placedMarks = computed(() => {
    const geometry = this.geometry();
    if (!geometry) return [];
    const { viewport, region } = geometry;
    return this.marks().map((mark) => {
      const box = toBox(viewport, mark.rect);
      return {
        ...mark,
        left: ((box.left - region.left) / region.width) * 100,
        top: ((box.top - region.top) / region.height) * 100,
        width: (box.width / region.width) * 100,
        height: (box.height / region.height) * 100,
      };
    });
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private renderTask: RenderTask | null = null;
  private run = 0;

  constructor() {
    this.watchVisibility();
    effect(() => {
      if (!this.visible()) return;
      const document = this.document();
      const page = this.page();
      const focus = this.focus();
      const canvas = this.canvas().nativeElement;
      untracked(() => void this.render(document, page, focus, canvas));
    });
    inject(DestroyRef).onDestroy(() => {
      this.run++;
      this.renderTask?.cancel();
    });
  }

  private async render(
    documentPromise: Promise<PDFDocumentProxy>,
    pageNumber: number,
    focus: PdfRect | null,
    canvas: HTMLCanvasElement,
  ): Promise<void> {
    const run = ++this.run;
    this.renderTask?.cancel();
    this.loading.set(true);
    try {
      const pdf = await documentPromise;
      const page = await pdf.getPage(pageNumber);
      if (run !== this.run) return;

      const viewport = page.getViewport({ scale: 1 });
      const region = focus ? around(viewport, focus) : fullPage(viewport);
      const scale = ((this.host.clientWidth || 600) / region.width) * (window.devicePixelRatio || 1);

      canvas.width = Math.max(1, Math.round(region.width * scale));
      canvas.height = Math.max(1, Math.round(region.height * scale));
      this.geometry.set({ viewport, region });

      // Translation en pixels, appliquée après la mise à l'échelle : seule la zone est dessinée.
      this.renderTask = page.render({
        canvas,
        viewport: page.getViewport({ scale }),
        transform: [1, 0, 0, 1, -region.left * scale, -region.top * scale],
      });
      await this.renderTask.promise;
      if (run === this.run) this.loading.set(false);
    } catch (error) {
      if (run !== this.run || isCancelled(error)) return;
      this.loading.set(false);
      this.failed.emit(error);
    }
  }

  /** Le rendu attend d'être à l'écran : un plan de signature peut contenir beaucoup de pages. */
  private watchVisibility(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.visible.set(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.visible.set(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(this.host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}

/** Rectangle PDF converti dans le repère du canvas, rotation de la page comprise. */
function toBox(viewport: PageViewport, rect: PdfRect): Box {
  const [x1, y1] = viewport.convertToViewportPoint(rect.x, rect.y);
  const [x2, y2] = viewport.convertToViewportPoint(rect.x + rect.width, rect.y + rect.height);
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function fullPage(viewport: PageViewport): Box {
  return { left: 0, top: 0, width: viewport.width, height: viewport.height };
}

function around(viewport: PageViewport, focus: PdfRect): Box {
  const box = toBox(viewport, focus);
  const left = Math.max(0, box.left - FOCUS_MARGIN_X);
  const top = Math.max(0, box.top - FOCUS_MARGIN_Y);
  const right = Math.min(viewport.width, box.left + box.width + FOCUS_MARGIN_X);
  const bottom = Math.min(viewport.height, box.top + box.height + FOCUS_MARGIN_Y);
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

function isCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === 'RenderingCancelledException';
}
