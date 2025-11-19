import { Prop, Schema } from "@nestjs/mongoose";

@Schema({ _id: false })
export class User {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true})
  name: string
}

