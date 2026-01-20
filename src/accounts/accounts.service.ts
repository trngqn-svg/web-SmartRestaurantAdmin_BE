import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Account, AccountDocument } from './account.schema';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ListAccountsDto } from './dto/list-accounts.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  findByUsername(username: string) {
    return this.accountModel.findOne({ username }).exec();
  }

  findById(id: string) {
    return this.accountModel.findById(id).exec();
  }

  async list(params: ListAccountsDto) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (params.role) filter.role = params.role;
    if (params.status) filter.status = params.status;
    if (params.q) filter.username = { $regex: params.q, $options: 'i' };

    const [items, total] = await Promise.all([
      this.accountModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.accountModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  async create(dto: CreateAccountDto) {
    const exists = await this.findByUsername(dto.username);
    if (exists) throw new BadRequestException('Username already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const doc = await this.accountModel.create({
      username: dto.username,
      password: hashedPassword,
      role: dto.role,
      status: 'ACTIVE',
      fullName: dto.username,
      address: '',
      phoneNumber: '',
    });

    const obj = doc.toObject();
    delete (obj as any).password;
    return obj;
  }

  async update(id: string, dto: UpdateAccountDto) {
    const acc = await this.accountModel.findById(id).exec();
    if (!acc) throw new NotFoundException('Account not found');

    if (dto.username && dto.username !== acc.username) {
      const exists = await this.findByUsername(dto.username);
      if (exists) throw new BadRequestException('Username already exists');
      acc.username = dto.username;
    }

    if (dto.password) acc.password = await bcrypt.hash(dto.password, 10);
    if (dto.role) acc.role = dto.role as any;
    if (dto.status) acc.status = dto.status as any;

    await acc.save();
    const obj = acc.toObject();
    delete (obj as any).password;
    return obj;
  }

  async disable(id: string) {
    const acc = await this.accountModel.findById(id).exec();
    if (!acc) throw new NotFoundException('Account not found');

    acc.status = 'DISABLED';
    await acc.save();
    return { ok: true };
  }

  async enable(id: string) {
    const acc = await this.accountModel.findById(id).exec();
    if (!acc) throw new NotFoundException('Account not found');

    acc.status = 'ACTIVE';
    await acc.save();
    return { ok: true };
  }
}
