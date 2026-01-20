import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ROLES, STATUSES } from '../common/constants/roles';
import type { Role, AccountStatus } from '../common/constants/roles';

export type AccountDocument = HydratedDocument<Account>;

@Schema({ timestamps: true })
export class Account {
  @Prop({ unique: true, required: true, trim: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: ROLES, default: 'ADMIN' })
  role: Role;

  @Prop({ type: String, enum: STATUSES, default: 'ACTIVE' })
  status: AccountStatus;

  @Prop({ trim: true, default: '' })
  fullName: string;

  @Prop({ trim: true, default: '' })
  address: string;

  @Prop({ trim: true, default: '' })
  phoneNumber: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
