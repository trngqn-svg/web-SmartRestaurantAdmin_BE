import { IsBoolean, IsIn, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @IsMongoId()
  categoryId: string;

  @IsNumber()
  @Min(0.01)
  @Max(999999)
  price: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  prepTimeMinutes?: number;

  @IsIn(['available', 'unavailable', 'sold_out'])
  status: 'available' | 'unavailable' | 'sold_out';

  @IsOptional()
  @IsBoolean()
  isChefRecommended?: boolean;
}

export class UpdateMenuItemDto extends CreateMenuItemDto {}

export function dollarsToCents(value: number): number {
  return Math.round(value * 100);
}