import { Module } from '@nestjs/common';
import { DateService } from './services/date.service';
import { NumberService } from './services/number.service';
import { WizardMessageService } from './services/wizard-message.service';

@Module({
    imports: [],
    providers: [DateService, NumberService, WizardMessageService],
    exports: [DateService, NumberService, WizardMessageService],
})
export class SharedModule {}
