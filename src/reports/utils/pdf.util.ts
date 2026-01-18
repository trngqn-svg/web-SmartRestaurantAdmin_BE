// src/modules/reports/utils/pdf.util.ts
import PDFDocument from 'pdfkit';

export async function buildReportPdf(args: {
  title: string;
  subtitle: string;
  totals: {
    revenueCents: number;
    ordersServed: number;
    avgOrderValueCents: number;
    avgPrepTimeSeconds: number | null;
    avgPrepSampleSize: number;
  };
  revenueSeries: Array<{ key: string; revenueCents: number }>;
  peakHours: Array<{ hour: number; orders: number }>;
  topItems: Array<{ name: string; totalQty: number }>;
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];

  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.font('Helvetica-Bold').fontSize(18).text(args.title);
  doc.font('Helvetica').fontSize(11).fillColor('#444').text(args.subtitle);

  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#444').text(args.subtitle);
  doc.moveDown(1);

  doc.fillColor('#000').fontSize(13).text('Summary');
  doc.moveDown(0.4);

  const { totals } = args;
  const fmtMoney = (cents: number) => `${(cents / 100).toFixed(2)}`;
  const fmtSec = (s: number | null) => (s == null ? '-' : `${Math.round(s)}s`);

  doc.fontSize(11);
  doc.text(`Total Revenue (Bill PAID): ${fmtMoney(totals.revenueCents)}`);
  doc.text(`Total Orders (served): ${totals.ordersServed}`);
  doc.text(`Avg Order Value (served): ${fmtMoney(totals.avgOrderValueCents)}`);
  doc.text(
    `Avg Prep Time: ${fmtSec(totals.avgPrepTimeSeconds)} (sample: ${totals.avgPrepSampleSize})`,
  );
  doc.moveDown(1);

  doc.fontSize(13).text('Revenue series');
  doc.moveDown(0.3);
  doc.fontSize(10);
  args.revenueSeries.forEach((p) => {
    doc.text(`${p.key}: ${fmtMoney(p.revenueCents)}`);
  });

  doc.moveDown(0.8);
  doc.fontSize(13).text('Peak hours');
  doc.moveDown(0.3);
  doc.fontSize(10);
  args.peakHours
    .slice()
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 8)
    .forEach((p) => {
      doc.text(`${p.hour}:00 - orders: ${p.orders}`);
    });

  doc.moveDown(0.8);
  doc.fontSize(13).text('Top selling items (qty)');
  doc.moveDown(0.3);
  doc.fontSize(10);
  args.topItems.forEach((x, i) => {
    doc.text(`${i + 1}. ${x.name} — qty: ${x.totalQty}`);
  });

  doc.end();
  return done;
}
