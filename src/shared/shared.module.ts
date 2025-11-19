import { Module } from '@nestjs/common';
import { DateService } from './services/date.service';

@Module({
  imports: [],
  providers: [
    DateService
  ],
  exports: [
    DateService
  ],
})
export class SharedModule {}