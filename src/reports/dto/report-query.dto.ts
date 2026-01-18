import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class ReportQueryDto {
  @IsIn(['week', 'month'])
  range: 'week' | 'month';

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  anchorDate?: string;
}
