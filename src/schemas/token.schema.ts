import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'one_time_tokens' })
export class OneTimeToken extends Document {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true, default: false })
  used: boolean;

  @Prop({ required: true, expires: 300 })
  expiresAt: Date;

  @Prop({ required: true })
  sub: string;
}

export const OneTimeTokenSchema = SchemaFactory.createForClass(OneTimeToken);