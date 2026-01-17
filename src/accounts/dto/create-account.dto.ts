import { IsIn, IsString, MinLength } from 'class-validator';
import { ROLES } from '../../common/constants/roles';

export class CreateAccountDto {
  @IsString()
  username: string;

  @MinLength(6)
  password: string;

  @IsIn(ROLES as unknown as string[])
  role: string;
}
