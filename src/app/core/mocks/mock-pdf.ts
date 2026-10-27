/** Emplacement de signature dessiné par `mockPdf` : tag invisible et mention lisible au-dessus. */
export interface MockSignatureSlot {
  tag: string;
  page: number;
  x: number;
  y: number;
  context: string;
}

/** Emplacements placés en bas de la dernière page, deux par ligne. */
export function mockSignatureSlots(pageCount: number, count: number): MockSignatureSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    tag: `s${index + 1}`,
    page: pageCount,
    x: 72 + (index % 2) * 270,
    y: 180 - Math.floor(index / 2) * 110,
    context: `Lu et approuve, signataire ${index + 1}`,
  }));
}

/**
 * PDF minimal (texte seul, Helvetica) pour les adaptateurs en mémoire : assez de pages pour exercer
 * la lecture obligatoire jusqu'en bas. Les caractères hors ASCII sont exclus du texte.
 * Avec `signatureSlots`, la dernière page porte des tags `{{sN}}` invisibles, comme un vrai document.
 */
export function mockPdf(title: string, pageCount = 3, signatureSlots = 0): Blob {
  const slots = mockSignatureSlots(pageCount, signatureSlots);
  const objects: string[] = [];
  const pageIds = Array.from({ length: pageCount }, (_, index) => 4 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pageIds.forEach((id, index) => {
    const pageSlots = slots.filter((slot) => slot.page === index + 1);
    const lines = [
      `BT /F1 18 Tf 72 760 Td (${escape(title)}) Tj ET`,
      `BT /F1 11 Tf 72 730 Td (Page ${index + 1} sur ${pageCount} - document simule) Tj ET`,
      ...Array.from(
        // La zone de signature remplace les dernières clauses.
        { length: pageSlots.length > 0 ? 20 : 30 },
        (_, line) => `BT /F1 10 Tf 72 ${690 - line * 20} Td (Clause ${line + 1} du contrat.) Tj ET`,
      ),
      ...pageSlots.flatMap((slot) => [
        `BT /F1 10 Tf ${slot.x} ${slot.y + 60} Td (${escape(slot.context)}) Tj ET`,
        // Mode de rendu 3 : texte invisible, comme les tags des vrais documents.
        `BT /F1 10 Tf 3 Tr ${slot.x} ${slot.y} Td ({{${slot.tag}}}) Tj ET`,
      ]),
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
