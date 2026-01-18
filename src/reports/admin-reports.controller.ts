// src/modules/reports/admin-reports.controller.ts
import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { writeCsvToResponse } from './utils/csv-fast.util';
import { buildReportPdf } from './utils/pdf.util';
import { RESTAURANT_ID } from 'src/config/restaurant.config';

@Controller('/admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('/overview')
  async overview(@Query() q: ReportQueryDto) {
    const restaurantId = RESTAURANT_ID;
    return this.reportsService.overview({
      restaurantId,
      range: q.range,
      anchorDate: q.anchorDate,
    });
  }

  @Get('/export.csv')
  async exportCsv(@Query() q: ReportQueryDto, @Res() res: Response) {
    const restaurantId = RESTAURANT_ID;

    const data = await this.reportsService.overview({
      restaurantId,
      range: q.range,
      anchorDate: q.anchorDate,
    });

    // 1 file CSV chứa nhiều "section" (giống mình làm trước)
    const rows: Array<Record<string, any>> = [];

    rows.push({
      section: 'totals',
      revenueCents: data.totals.revenueCents,
      ordersServed: data.totals.ordersServed,
      avgOrderValueCents: data.totals.avgOrderValueCents,
      avgPrepTimeSeconds: data.totals.avgPrepTimeSeconds ?? '',
      avgPrepSampleSize: data.totals.avgPrepSampleSize,
    });

    for (const x of data.revenueSeries) {
      rows.push({
        section: 'revenueSeries',
        key: x.key,
        revenueCents: x.revenueCents,
      });
    }

    for (const x of data.peakHours) {
      rows.push({
        section: 'peakHours',
        hour: x.hour,
        orders: x.orders,
      });
    }

    for (const x of data.topItems) {
      rows.push({
        section: 'topItems',
        itemId: x.itemId,
        name: x.name,
        totalQty: x.totalQty,
      });
    }

    await writeCsvToResponse({
      res,
      filename: `report-${q.range}-${q.anchorDate ?? 'today'}.csv`,
      rows,
      headers: true,
    });
  }

  @Get('/export.pdf')
  async exportPdf(@Query() q: ReportQueryDto, @Res() res: Response) {
    const restaurantId = RESTAURANT_ID;
    const data = await this.reportsService.overview({
      restaurantId,
      range: q.range,
      anchorDate: q.anchorDate,
    });

    const title = `Admin Report (${q.range.toUpperCase()})`;
    const subtitle = `Range: ${new Date(data.from).toISOString()}  ->  ${new Date(data.to).toISOString()} (timezone Asia/Ho_Chi_Minh)`;

    const pdfBuf = await buildReportPdf({
      title,
      subtitle,
      totals: data.totals,
      revenueSeries: data.revenueSeries,
      peakHours: data.peakHours,
      topItems: data.topItems.map((x: any) => ({ name: x.name, totalQty: x.totalQty })),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${q.range}.pdf"`);
    return res.send(pdfBuf);
  }
}
