import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {session } from 'telegraf'
import { NewBillWizard } from './wizards/bill.wizard';
import { NewInstallmentWizard } from './wizards/instalment.wizard';

@Module({
  imports: [
    ConfigModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('BOT_TOKEN') ?? '',
        middlewares: [session()]
      }),
      
    })
  ],
  providers: [
    BotUpdate, 
    NewBillWizard,
    NewInstallmentWizard
  ],
})
export class BotModule {}
