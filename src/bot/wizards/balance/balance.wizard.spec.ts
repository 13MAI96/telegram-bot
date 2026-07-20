import { BalanceWizard } from './balance.wizard';

function createWizardContext(overrides: Record<string, unknown> = {}) {
    return {
        message: {
            text: '',
            from: { first_name: 'Tester' },
        },
        reply: jest.fn().mockResolvedValue(undefined),
        wizard: {
            state: {},
            next: jest.fn(),
            back: jest.fn(),
            selectStep: jest.fn(),
        },
        scene: {
            leave: jest.fn().mockResolvedValue(undefined),
            enter: jest.fn().mockResolvedValue(undefined),
            current: { id: 'balance' },
        },
        ...overrides,
    } as any;
}

describe('BalanceWizard', () => {
    it('accepts holder option 0', async () => {
        const observableData = {
            holders: [
                { name: 'Ana', accounts: [] },
                { name: 'Luis', accounts: [] },
            ],
        };
        const sheetsService = {
            getObservableData: jest.fn().mockResolvedValue(observableData),
        };
        const wizard = new BalanceWizard(sheetsService as any);
        const ctx = createWizardContext({
            message: { text: '0', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        holders: ['Ana', 'Luis'],
                    },
                },
            },
        });

        await wizard.step3(ctx);

        expect(sheetsService.getObservableData).toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('[object Object]'),
        );
        expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('accepts account option 0', async () => {
        const observableData = {
            holders: [
                {
                    name: 'Ana',
                    accounts: [{ name: 'EFECTIVO', balance: 100 }],
                },
            ],
        };
        const sheetsService = {
            getObservableData: jest.fn().mockResolvedValue(observableData),
        };
        const wizard = new BalanceWizard(sheetsService as any);
        const ctx = createWizardContext({
            message: { text: '0', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        accounts: ['EFECTIVO', 'BANCO'],
                    },
                },
            },
        });

        await wizard.getByAccount(ctx);

        expect(sheetsService.getObservableData).toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('[object Object]'),
        );
        expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('replies with an invalid-number message for an out-of-range holder option', async () => {
        const sheetsService = {
            getObservableData: jest.fn(),
        };
        const wizard = new BalanceWizard(sheetsService as any);
        const ctx = createWizardContext({
            message: { text: '2', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        holders: ['Ana', 'Luis'],
                    },
                },
            },
        });

        await wizard.step3(ctx);

        expect(sheetsService.getObservableData).not.toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(`El numero enviado no es valido.`);
        expect(ctx.scene.leave).not.toHaveBeenCalled();
    });
});
