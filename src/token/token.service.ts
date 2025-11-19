import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { OneTimeToken } from 'src/schemas/token.schema';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel(OneTimeToken.name) private tokenModel: Model<OneTimeToken>,
  ) {}

  async generateTokenForUser(sub: string): Promise<string> {
    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.tokenModel.create({ token, expiresAt, sub });
    return token;
  }

  async validateAndUseToken(token: string): Promise<Boolean> {
    const doc = await this.tokenModel.findOne({ token });

    if (!doc){ 
      // throw new BadRequestException('Token inválido o expirado')
      return false
    };
    if (doc.used){
      // throw new BadRequestException('Token ya utilizado')
      return false
    };

    doc.used = true;
    await doc.save();
    return true
  }
}