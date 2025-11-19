// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from '../schemas/group.schema';
import { SheetsModule } from 'src/sheets/sheets.module';
import { SheetsService } from 'src/sheets/sheets.service';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema}]),
  ],
  controllers: [],
  providers: [GroupService],
  exports: [GroupService]
})
export class GroupModule {}
