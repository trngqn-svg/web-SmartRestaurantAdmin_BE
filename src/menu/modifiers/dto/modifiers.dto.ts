import { IsBoolean, IsIn, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateModifierGroupDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @IsIn(['single', 'multiple'])
  selectionType: 'single' | 'multiple';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSelections?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxSelections?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

export class CreateModifierOptionDto {
  @IsMongoId()
  groupId: string;

  @IsString()
  @Length(1, 80)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAdjustment?: number;
}

export class AttachModifierGroupsDto {
  groupIds: string[];
}
