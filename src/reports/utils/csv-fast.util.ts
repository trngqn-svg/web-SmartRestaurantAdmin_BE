import { format } from '@fast-csv/format';
import type { Response } from 'express';

export async function writeCsvToResponse(args: {
  res: Response;
  filename: string;
  rows: Array<Record<string, any>>;
  headers?: boolean;
}) {
  const { res, filename, rows, headers = true } = args;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  res.write('\uFEFF');

  return new Promise<void>((resolve, reject) => {
    const csvStream = format({ headers, quoteColumns: true, quoteHeaders: true });

    csvStream
      .on('error', reject)
      .on('end', () => resolve())
      .pipe(res);

    for (const row of rows) csvStream.write(row);
    csvStream.end();
  });
}
