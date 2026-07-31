import { Module } from '@nestjs/common';
import { DateService } from './services/date/date.service';
import { CsvService } from './services/csv/csv.service';
import { DashboardDataService } from './services/dashboard/dashboard-data.service';
import { ExcelService } from './services/excel/excel.service';
import { NumberService } from './services/number/number.service';
import { PieChartImageService } from './services/dashboard/pie-chart-image.service';
import { PlainTextTransactionService } from './services/plain-text-transaction/plain-text-transaction.service';
import { WizardMessageService } from './services/wizard-message/wizard-message.service';

@Module({
    imports: [],
    providers: [
        DateService,
        CsvService,
        DashboardDataService,
        ExcelService,
        NumberService,
        PieChartImageService,
        PlainTextTransactionService,
        WizardMessageService,
    ],
    exports: [
        DateService,
        CsvService,
        DashboardDataService,
        ExcelService,
        NumberService,
        PieChartImageService,
        PlainTextTransactionService,
        WizardMessageService,
    ],
})
export class SharedModule {}
