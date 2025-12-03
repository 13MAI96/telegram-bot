import { Module } from '@nestjs/common';
import { DateService } from './services/date.service';
import { CsvService } from './services/csv.service';
import { ExcelService } from './services/excel.service';

@Module({
  imports: [],
  providers: [
    DateService,
    CsvService,
    ExcelService
  ],
  exports: [
    DateService,
    CsvService,
    ExcelService
  ],
})
export class SharedModule {}