import { IsInt, IsOptional, IsString, Length, Min, IsIn, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 50)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

export class UpdateCategoryDto extends CreateCategoryDto {
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}
