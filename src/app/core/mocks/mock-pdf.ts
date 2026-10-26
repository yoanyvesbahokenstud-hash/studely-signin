/**
 * PDF minimal (texte seul, Helvetica) pour les adaptateurs en mémoire : assez de pages pour exercer
 * la lecture obligatoire jusqu'en bas. Les caractères hors ASCII sont exclus du texte.
 */
export function mockPdf(title: string, pageCount = 3): Blob {
  const objects: string[] = [];
  const pageIds = Array.from({ length: pageCount }, (_, index) => 4 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pageIds.forEach((id, index) => {
    const lines = [
      `BT /F1 18 Tf 72 760 Td (${escape(title)}) Tj ET`,
      `BT /F1 11 Tf 72 730 Td (Page ${index + 1} sur ${pageCount} - document simule) Tj ET`,
      ...Array.from(
        { length: 30 },
        (_, line) => `BT /F1 10 Tf 72 ${690 - line * 20} Td (Clause ${line + 1} du contrat.) Tj ET`,
      ),
    ].join('\n');
    objects[id] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`;
    objects[id + 1] = `<< /Length ${lines.length} >>\nstream\n${lines}\nendstream`;
  });

  let body = '%PDF-1.7\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([body], { type: 'application/pdf' });
}

function escape(text: string): string {
  return text.replace(/[^\x20-\x7e]/g, '').replace(/([\\()])/g, '\\$1');
}
