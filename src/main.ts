import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BotModule } from './bot/bot.module';
import { KoyebWakeCoordinatorService } from './bot/services/koyeb-wake-coordinator.service';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const port = Number(process.env.PORT) || 3000;
    const koyebWakeCoordinatorService = app
        .select(BotModule)
        .get(KoyebWakeCoordinatorService, { strict: false });

    app.use((req: Request, _res: Response, next: NextFunction) => {
        if (req.path === '/wake') {
            koyebWakeCoordinatorService.recordHttpActivity();
        }
        next();
    });

    process.once('SIGINT', async () => {
        await koyebWakeCoordinatorService.flushPendingWarning();
        console.log('SIGINT');
        await app.close();
        process.exit(0);
    });

    process.once('SIGTERM', async () => {
        await koyebWakeCoordinatorService.flushPendingWarning();
        console.log('SIGTERM');
        await app.close();
        process.exit(0);
    });

    await app.listen(port, '0.0.0.0');
}
void bootstrap();
