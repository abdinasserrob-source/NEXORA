import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildInvoicePdf(opts: {
  orderId: string;
  customerName: string;
  lines: { title: string; qty: number; unit: number; total: number }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  createdAt: Date;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  page.drawText("NEXORA — Facture", {
    x: 50,
    y,
    size: 18,
    font: bold,
    color: rgb(0.1, 0.4, 0.9),
  });
  y -= 28;
  page.drawText(`Commande ${opts.orderId}`, { x: 50, y, size: 11, font });
  y -= 16;
  page.drawText(`Client : ${opts.customerName}`, { x: 50, y, size: 10, font });
  y -= 14;
  page.drawText(`Date : ${opts.createdAt.toISOString()}`, { x: 50, y, size: 10, font });
  y -= 30;

  page.drawText("Articles", { x: 50, y, size: 12, font: bold });
  y -= 18;
  for (const l of opts.lines) {
    page.drawText(
      `${l.title} × ${l.qty}  @ ${l.unit.toFixed(2)} €  =  ${l.total.toFixed(2)} €`,
      { x: 50, y, size: 10, font }
    );
    y -= 14;
    if (y < 100) break;
  }
  y -= 10;
  page.drawText(`Sous-total : ${opts.subtotal.toFixed(2)} €`, { x: 350, y, size: 10, font });
  y -= 14;
  page.drawText(`Livraison : ${opts.shipping.toFixed(2)} €`, { x: 350, y, size: 10, font });
  y -= 14;
  page.drawText(`Remise : ${opts.discount.toFixed(2)} €`, { x: 350, y, size: 10, font });
  y -= 18;
  page.drawText(`TOTAL TTC : ${opts.total.toFixed(2)} €`, {
    x: 350,
    y,
    size: 12,
    font: bold,
  });

  page.drawText("Paiement simulé (Stripe test) — document généré automatiquement.", {
    x: 50,
    y: 60,
    size: 8,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  return doc.save();
}
