import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OneTimeToken, OneTimeTokenSchema } from 'src/schemas/token.schema';
import { TokenService } from './token.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OneTimeToken.name, schema: OneTimeTokenSchema },
    ]),
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}