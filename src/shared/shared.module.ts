import { Module } from '@nestjs/common';
import { DateService } from './services/date.service';
import { CsvService } from './services/csv.service';
import { ExcelService } from './services/excel.service';
import { NumberService } from './services/number.service';
import { WizardMessageService } from './services/wizard-message.service';

@Module({
    imports: [],
    providers: [
        DateService,
        CsvService,
        ExcelService,
        NumberService,
        WizardMessageService,
    ],
    exports: [
        DateService,
        CsvService,
        ExcelService,
        NumberService,
        WizardMessageService,
    ],
})
export class SharedModule {}
