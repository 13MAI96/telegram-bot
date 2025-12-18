import { Types } from "mongoose";
import { Spreadsheet } from "src/schemas/sheet.schema";
import { User } from "src/schemas/user.schema";

export class CreateGroupDto{
    _id?: Types.ObjectId
    admin: string
    users: User[]
    spreadsheet: Spreadsheet;
    categories: string[]
    accounts: string[]
    holders: string[]
    instalment_category?: string
    self_transfer_category?: string
}