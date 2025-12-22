import { Module } from '@nestjs/common';
import { DateService } from './services/date.service';
import { CsvService } from './services/csv.service';
import { ExcelService } from './services/excel.service';
import { NumberService } from './services/number.service';

@Module({
  imports: [],
  providers: [
    DateService,
    CsvService,
    ExcelService, 
    NumberService,
  ],
  exports: [
    DateService,
    CsvService,
    ExcelService,
    NumberService
  ]
})
export class SharedModule {}