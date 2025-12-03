import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {session } from 'telegraf'
import { GroupService } from 'src/group/group.service';
import { GroupModule } from 'src/group/group.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from 'src/schemas/group.schema';
import { SheetsModule } from 'src/sheets/sheets.module';
import { SheetsService } from 'src/sheets/sheets.service';
import { TokenModule } from 'src/token/token.module';
import { TokenService } from 'src/token/token.service';
import { OneTimeToken, OneTimeTokenSchema } from 'src/schemas/token.schema';
import Wizards from './wizards';
import { SharedModule } from 'src/shared/shared.module';
import { DateService } from 'src/shared/services/date.service';
import { CsvService } from 'src/shared/services/csv.service';
import { ExcelService } from 'src/shared/services/excel.service';


@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema}, { name: OneTimeToken.name, schema: OneTimeTokenSchema }]),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('BOT_TOKEN') ?? '',
        middlewares: [session()]
      }),
    }),
    GroupModule,
    SheetsModule, 
    TokenModule,
    SharedModule
  ],
  providers: [
    ...Wizards,
    BotUpdate, 
    GroupService,
    SheetsService,
    TokenService,
    DateService,
    CsvService,
    ExcelService
  ],
})
export class BotModule {}
