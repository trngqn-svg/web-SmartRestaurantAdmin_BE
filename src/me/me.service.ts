import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from '../accounts/account.schema';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

function safeTrim(v: unknown) {
  return typeof v === 'string' ? v.trim() : undefined;
}

@Injectable()
export class MeService {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
  ) {}

  async getMyProfile(accountId: string) {
    const doc = await this.accountModel
      .findById(accountId)
      .select('username role status fullName address phoneNumber createdAt updatedAt')
      .lean();

    if (!doc) throw new NotFoundException('Account not found');
    return { ok: true, profile: doc };
  }

  async updateMyProfile(accountId: string, dto: UpdateMyProfileDto) {
    const patch: Partial<Account> = {};

    const fullName = safeTrim(dto.fullName);
    const address = safeTrim(dto.address);
    const phoneNumber = safeTrim(dto.phoneNumber);

    if (fullName !== undefined) patch.fullName = fullName;
    if (address !== undefined) patch.address = address;
    if (phoneNumber !== undefined) patch.phoneNumber = phoneNumber;

    const doc = await this.accountModel
      .findByIdAndUpdate(
        accountId,
        { $set: patch },
        { new: true, projection: 'username role status fullName address phoneNumber createdAt updatedAt' },
      )
      .lean();

    if (!doc) throw new NotFoundException('Account not found');
    return { ok: true, profile: doc };
  }
}
