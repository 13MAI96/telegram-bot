import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  process.once('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });

  process.once('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
