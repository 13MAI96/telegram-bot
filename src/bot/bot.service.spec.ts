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

function createCoordinator() {
    return {
        recordTelegramActivity: jest.fn(),
    };
}

describe('BotUpdate fixed command', () => {
    it('enters fixed when a group is assigned', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn().mockResolvedValue({ _id: 'group-1' }),
        };
        const bot = createBot();
        const update = new BotUpdate(
            groupService as any,
            createCoordinator() as any,
            bot,
        );
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
        const update = new BotUpdate(
            groupService as any,
            createCoordinator() as any,
            bot,
        );
        const ctx = {
            message: { from: { id: 123 } },
            scene: {
                enter: jest.fn(),
            },
        } as any;

        await update.fixedCost(ctx);

        expect(ctx.scene.enter).toHaveBeenCalledWith('new-group');
    });

    it('does not enter plane-text while another scene is active', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn(),
        };
        const bot = createBot();
        const update = new BotUpdate(
            groupService as any,
            createCoordinator() as any,
            bot,
        );
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
        const update = new BotUpdate(
            groupService as any,
            createCoordinator() as any,
            bot,
        );
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

    it('records Telegram activity for messages', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn(),
        };
        const coordinator = createCoordinator();
        const bot = createBot();
        const update = new BotUpdate(
            groupService as any,
            coordinator as any,
            bot,
        );

        const next = jest.fn().mockResolvedValue(undefined);

        await update.trackMessageActivity({ from: { id: 123 } } as any, next);

        expect(coordinator.recordTelegramActivity).toHaveBeenCalledWith('123');
        expect(next).toHaveBeenCalled();
    });

    it('records Telegram activity for callback queries', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn(),
        };
        const coordinator = createCoordinator();
        const bot = createBot();
        const update = new BotUpdate(
            groupService as any,
            coordinator as any,
            bot,
        );

        const next = jest.fn().mockResolvedValue(undefined);

        await update.trackCallbackActivity(
            { from: { id: 456 } } as any,
            next,
        );

        expect(coordinator.recordTelegramActivity).toHaveBeenCalledWith('456');
        expect(next).toHaveBeenCalled();
    });
});
