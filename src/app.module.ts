import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

const mongoLogger = new Logger('MongoConnection');

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                uri: configService.get<string>('MONGO') ?? '',
                lazyConnection: true,
                onConnectionCreate: (connection) => {
                    mongoLogger.log(
                        `Connected to MongoDB: ${connection.host}:${connection.port}/${connection.name}`,
                    );

                    connection.on('disconnected', () => {
                        mongoLogger.warn('MongoDB disconnected');
                    });

                    connection.on('reconnected', () => {
                        mongoLogger.log('MongoDB reconnected');
                    });

                    connection.on('error', (error) => {
                        mongoLogger.error(
                            `MongoDB connection error: ${error.message}`,
                        );
                    });
                },
            }),
        }),
        BotModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
