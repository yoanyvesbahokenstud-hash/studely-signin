/** Copié depuis `node_modules/pdfjs-dist/build` par `angular.json` (assets). */
const WORKER_PATH = 'pdfjs/pdf.worker.min.mjs';

/** Charge pdf.js à la demande (le paquet est lourd) et configure son worker. */
export async function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(WORKER_PATH, document.baseURI).href;
  return pdfjs;
}
