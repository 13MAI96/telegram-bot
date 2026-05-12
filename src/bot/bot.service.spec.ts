import { BotUpdate } from './bot.service';

describe('BotUpdate fixed command', () => {
    it('enters fixed when a group is assigned', async () => {
        const groupService = {
            hasAssignedGroup: jest.fn().mockResolvedValue({ _id: 'group-1' }),
        };
        const bot = {
            telegram: {
                deleteWebhook: jest.fn(),
            },
            catch: jest.fn(),
            launch: jest.fn(),
            stop: jest.fn(),
        } as any;
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
        const bot = {
            telegram: {
                deleteWebhook: jest.fn(),
            },
            catch: jest.fn(),
            launch: jest.fn(),
            stop: jest.fn(),
        } as any;
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
});
