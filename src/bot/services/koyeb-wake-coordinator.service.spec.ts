import { ConfigService } from '@nestjs/config';
import { KoyebWakeActivityService } from './koyeb-wake-activity.service';
import { KoyebWakeCoordinatorService } from './koyeb-wake-coordinator.service';

function createService(overrides: Record<string, unknown> = {}) {
    const configService = {
        get: jest.fn().mockReturnValue('https://example.com'),
    };
    const bot = {
        telegram: {
            sendMessage: jest.fn().mockResolvedValue(undefined),
        },
    };
    const activityService = new KoyebWakeActivityService();

    return new KoyebWakeCoordinatorService(
        { ...configService, ...overrides } as ConfigService,
        activityService,
        bot as any,
    );
}

describe('KoyebWakeCoordinatorService', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-05-13T12:00:00.000Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('warns only recently active users with a Spanish first-person message', async () => {
        const service = createService();
        const activityService = (service as unknown as {
            koyebWakeActivityService: KoyebWakeActivityService;
        }).koyebWakeActivityService;
        jest.setSystemTime(new Date('2026-05-13T10:59:00.000Z'));
        activityService.recordTelegramActivity(456);
        jest.setSystemTime(new Date('2026-05-13T12:00:00.000Z'));
        activityService.recordTelegramActivity(123);

        await service.onModuleInit();
        await jest.advanceTimersByTimeAsync(59 * 60 * 1000);

        const sendMessage = (
            service as unknown as {
                bot: { telegram: { sendMessage: jest.Mock } };
            }
        ).bot.telegram.sendMessage;

        expect(sendMessage).toHaveBeenCalledTimes(1);
        expect(sendMessage).toHaveBeenCalledWith(
            123,
            expect.stringContaining(
                'Me estoy por ir a dormir, si necesitás algo más no te olvides de despertarme en https://example.com/wake',
            ),
        );
    });

    it('does not send duplicate warnings within the same cycle', async () => {
        const service = createService();
        (
            service as unknown as {
                koyebWakeActivityService: KoyebWakeActivityService;
            }
        ).koyebWakeActivityService.recordTelegramActivity(123);

        await service.onModuleInit();
        await jest.advanceTimersByTimeAsync(59 * 60 * 1000);

        const sendMessage = (
            service as unknown as {
                bot: { telegram: { sendMessage: jest.Mock } };
            }
        ).bot.telegram.sendMessage;

        expect(sendMessage).toHaveBeenCalledTimes(1);
        await expect(service.flushPendingWarning()).resolves.toBe(false);
        expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    it('resets the warning cycle on inbound HTTP activity', async () => {
        const service = createService();
        (
            service as unknown as {
                koyebWakeActivityService: KoyebWakeActivityService;
            }
        ).koyebWakeActivityService.recordTelegramActivity(123);

        await service.onModuleInit();
        await jest.advanceTimersByTimeAsync(30 * 60 * 1000);
        service.recordHttpActivity();
        (
            service as unknown as {
                koyebWakeActivityService: KoyebWakeActivityService;
            }
        ).koyebWakeActivityService.recordTelegramActivity(123);
        await jest.advanceTimersByTimeAsync(57 * 60 * 1000);

        const sendMessage = (
            service as unknown as {
                bot: { telegram: { sendMessage: jest.Mock } };
            }
        ).bot.telegram.sendMessage;

        expect(sendMessage).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1 * 60 * 1000);
        expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    it('continues notifying other users after a send failure', async () => {
        const configService = {
            get: jest.fn().mockReturnValue('https://example.com'),
        };
        const bot = {
            telegram: {
                sendMessage: jest
                    .fn()
                    .mockRejectedValueOnce(new Error('boom'))
                    .mockResolvedValueOnce(undefined),
            },
        };
        const service = new KoyebWakeCoordinatorService(
            configService as any,
            new KoyebWakeActivityService(),
            bot as any,
        );

        (
            service as unknown as {
                koyebWakeActivityService: KoyebWakeActivityService;
            }
        ).koyebWakeActivityService.recordTelegramActivity(123);
        (
            service as unknown as {
                koyebWakeActivityService: KoyebWakeActivityService;
            }
        ).koyebWakeActivityService.recordTelegramActivity(456);

        await service.onModuleInit();
        await jest.advanceTimersByTimeAsync(59 * 60 * 1000);

        expect(bot.telegram.sendMessage).toHaveBeenCalledTimes(2);
        expect(bot.telegram.sendMessage).toHaveBeenNthCalledWith(
            1,
            123,
            expect.any(String),
        );
        expect(bot.telegram.sendMessage).toHaveBeenNthCalledWith(
            2,
            456,
            expect.any(String),
        );
    });
});
