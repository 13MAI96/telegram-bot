import { Module } from '@nestjs/common';
import { SheetsService } from './sheets.service';

@Module({
  imports: [],
  providers: [SheetsService],
  exports: [SheetsService],
})
export class SheetsModule {}