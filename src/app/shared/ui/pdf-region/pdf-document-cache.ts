import { Injectable, OnDestroy } from '@angular/core';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdfjs } from '../pdf-pages/pdfjs';

/**
 * PDF déjà téléchargés et ouverts par pdf.js, par clé (l'identifiant du document) :
 * un document est chargé une seule fois, même s'il est affiché à plusieurs endroits.
 * Les liens présignés expirent ; une fois le PDF chargé, le lien ne sert plus.
 * À fournir au niveau de l'écran : tout est libéré quand l'écran est détruit.
 */
@Injectable()
export class PdfDocumentCache implements OnDestroy {
  private readonly tasks = new Map<string, Promise<PDFDocumentLoadingTask>>();

  /** `url` n'est appelée que si le document n'est pas déjà chargé. */
  load(key: string, url: () => Promise<string>): Promise<PDFDocumentProxy> {
    let task = this.tasks.get(key);
    if (!task) {
      task = Promise.all([loadPdfjs(), url()]).then(([pdfjs, link]) =>
        pdfjs.getDocument({ url: link }),
      );
      this.tasks.set(key, task);
      // Un échec (lien expiré, réseau) ne doit pas rester en cache.
      task.then((loading) => loading.promise).catch(() => this.forget(key));
    }
    return task.then((loading) => loading.promise);
  }

  /** À appeler quand le document change ou disparaît. */
  forget(key: string): void {
    const task = this.tasks.get(key);
    this.tasks.delete(key);
    void task?.then((loading) => loading.destroy()).catch(() => undefined);
  }

  ngOnDestroy(): void {
    [...this.tasks.keys()].forEach((key) => this.forget(key));
  }
}
