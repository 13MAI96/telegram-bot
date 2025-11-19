import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"

/**
 * Sheet
 * Class used for each sheet on a document
 * id is an identificator of google for the sheet
 * name is an identificator of the user for the sheet
 */
@Schema({ _id: false }) 
export class Sheet {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;
}

export const SheetSchema = SchemaFactory.createForClass(Sheet);


@Schema({ _id: false })
export class Spreadsheet {
  @Prop({ required: true })
  id: string;

  @Prop({ type: Sheet, required: true })
  balance_sheet: Sheet;

  @Prop({ type: Sheet})
  observation_sheet: Sheet;

  @Prop({ type: Sheet})
  projection_sheet: Sheet;
}

export const SpreadsheetSchema = SchemaFactory.createForClass(Spreadsheet);