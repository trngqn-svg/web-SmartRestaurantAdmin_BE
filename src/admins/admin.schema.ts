import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminDocument = HydratedDocument<Admin>;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ unique: true, required: true, trim: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'ADMIN' })
  role: string;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
