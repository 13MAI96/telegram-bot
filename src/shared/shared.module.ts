import { Module } from '@nestjs/common';
import { DateService } from './services/date.service';
import { NumberService } from './services/number.service';

@Module({
  imports: [],
  providers: [
    DateService,
    NumberService
  ],
  exports: [
    DateService,
    NumberService
  ],
})
export class SharedModule {}