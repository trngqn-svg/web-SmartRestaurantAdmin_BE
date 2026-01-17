import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ROLES, STATUSES } from '../../common/constants/roles';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsIn(ROLES as unknown as string[])
  role?: string;

  @IsOptional()
  @IsIn(STATUSES as unknown as string[])
  status?: string;
}
