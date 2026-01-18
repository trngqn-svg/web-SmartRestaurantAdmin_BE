import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminListOrdersQueryDto {
  @IsOptional()
  @IsString()
  status?: string; // pending/served/...

  @IsOptional()
  @IsString()
  tableId?: string; // ObjectId string

  @IsOptional()
  @IsIn(['today', 'yesterday', 'this_week', 'this_month'])
  date?: 'today' | 'yesterday' | 'this_week' | 'this_month';

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
