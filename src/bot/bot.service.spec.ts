import { BotUpdate } from './bot.service';

function createBot() {
    return {
        telegram: {
            deleteWebhook: jest.fn().mockResolvedValue(undefined),
        },
        catch: jest.fn(),
        launch: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        use: jest.fn(),
    } as any;
}

describe('BotUpdate fixed command', () => {
    it('does not block module init on Telegram startup', async () => {
        let resolveDeleteWebhook: (() => void) | undefined;
        const bot = {
            telegram: {
                deleteWebhook: jest.fn(
                    () =>
                        new Promise<void>((resolve) => {
                            resolveDeleteWebhook = resolve;
                        }),
                ),
            },
            catch: jest.fn(),
            launch: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue(undefined),
            use: jest.fn(),
        } as any;
        const update = new BotUpdate({ hasAssignedGroup: jest.fn() } as any, bot);

        await update.onModuleInit();

        expect(bot.telegram.deleteWebhook).toHaveBeenCalledWith({
            drop_pending_updates: true,
        });
        expect(bot.launch).not.toHaveBeenCalled();

        resolveDeleteWebhook?.();
        await Promise.resolve();
        await Promise.resolve();

        expect(bot.launch).toHaveBeenCalled();
    });

    it('enters fixed when a group is assigned', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn().mockResolvedValue({ _id: 'group-1' }),
        };
        const bot = createBot();
        const update = new BotUpdate(groupService as any, bot);
        const ctx = {
            message: { from: { id: 123 } },
            scene: {
                enter: jest.fn(),
            },
        } as any;

        await update.fixedCost(ctx);

        expect(ctx.scene.enter).toHaveBeenCalledWith('fixed', {
            group: { _id: 'group-1' },
        });
    });

    it('redirects to onboarding when no group is assigned', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn().mockResolvedValue(null),
        };
        const bot = createBot();
        const update = new BotUpdate(groupService as any, bot);
        const ctx = {
            message: { from: { id: 123 } },
            scene: {
                enter: jest.fn(),
            },
        } as any;

        await update.fixedCost(ctx);

        expect(ctx.scene.enter).toHaveBeenCalledWith('new-group');
    });

    it('enters income when a group is assigned', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn().mockResolvedValue({ _id: 'group-1' }),
        };
        const bot = createBot();
        const update = new BotUpdate(groupService as any, bot);
        const ctx = {
            message: { from: { id: 123 } },
            scene: {
                enter: jest.fn(),
            },
        } as any;

        await update.startIncome(ctx);

        expect(ctx.scene.enter).toHaveBeenCalledWith('income', {
            group: { _id: 'group-1' },
        });
    });

    it('does not enter plane-text while another scene is active', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn(),
        };
        const bot = createBot();
        const update = new BotUpdate(groupService as any, bot);
        const ctx = {
            message: { from: { id: 123 }, text: '0' },
            scene: {
                current: { id: 'fixed' },
                enter: jest.fn(),
            },
        } as any;

        await update.planeTextManager(ctx);

        expect(groupService.hasAssignedGroup).not.toHaveBeenCalled();
        expect(ctx.scene.enter).not.toHaveBeenCalled();
    });

    it('does not enter plane-text for slash commands', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn(),
        };
        const bot = createBot();
        const update = new BotUpdate(groupService as any, bot);
        const ctx = {
            message: { from: { id: 123 }, text: '/help' },
            scene: {
                enter: jest.fn(),
            },
        } as any;

        await update.planeTextManager(ctx);

        expect(groupService.hasAssignedGroup).not.toHaveBeenCalled();
        expect(ctx.scene.enter).not.toHaveBeenCalled();
    });
});
