import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Spreadsheet, SpreadsheetSchema } from 'src/schemas/sheet.schema';
import { User } from './user.schema';

@Schema({ _id: false }) 
export class FixedCost {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;
}

export const FixedCostSchema = SchemaFactory.createForClass(FixedCost);

export type GroupDocument = HydratedDocument<Group>;

@Schema({timestamps: true, collection: 'groups'})
export class Group {

  _id: Types.ObjectId;

  @Prop({required: true})
  admin: string

  @Prop({ required: true})
  users: User[]

  @Prop({ type: SpreadsheetSchema, required: true })
  spreadsheet: Spreadsheet;

  @Prop({ required: true})
  categories: string[]

  @Prop({ required: true})
  accounts: string[]

  @Prop({ required: true})
  holders: string[]

  @Prop()
  instalment_categories: string[];

  @Prop()
  self_transfer_category: string

  createdAt?: Date;
  updatedAt?: Date;

}

export const GroupSchema = SchemaFactory.createForClass(Group);