import { Module } from '@nestjs/common';
import { KoyebWakeActivityService } from './koyeb-wake-activity.service';

@Module({
    providers: [KoyebWakeActivityService],
    exports: [KoyebWakeActivityService],
})
export class KoyebWakeActivityModule {}
