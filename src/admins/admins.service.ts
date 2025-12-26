import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from './admin.schema';

@Injectable()
export class AdminsService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) {}

  findByUsername(username: string) {
    return this.adminModel.findOne({ username }).exec();
  }

  create(data: Partial<Admin>) {
    return this.adminModel.create(data);
  }

  async findById(id: string) {
    return this.adminModel.findById(id).exec();
  }
}
