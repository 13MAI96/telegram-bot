import { Module } from '@nestjs/common';
import { DateService } from './services/date/date.service';
import { CsvService } from './services/csv/csv.service';
import { ExcelService } from './services/excel/excel.service';
import { NumberService } from './services/number/number.service';
import { PlainTextTransactionService } from './services/plain-text-transaction/plain-text-transaction.service';
import { WizardMessageService } from './services/wizard-message/wizard-message.service';

@Module({
    imports: [],
    providers: [
        DateService,
        CsvService,
        ExcelService,
        NumberService,
        PlainTextTransactionService,
        WizardMessageService,
    ],
    exports: [
        DateService,
        CsvService,
        ExcelService,
        NumberService,
        PlainTextTransactionService,
        WizardMessageService,
    ],
})
export class SharedModule {}
