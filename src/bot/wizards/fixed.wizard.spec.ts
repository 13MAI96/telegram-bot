import { FixedWizard } from './fixed.wizard';
import { DateService } from 'src/shared/services/date.service';
import { NumberService } from 'src/shared/services/number.service';
import { WizardMessageService } from 'src/shared/services/wizard-message.service';

function createCtx(overrides: Record<string, unknown> = {}) {
    return {
        message: {
            text: '',
            from: { first_name: 'Tester' },
        },
        reply: jest.fn().mockResolvedValue(undefined),
        wizard: {
            state: {},
            next: jest.fn(),
        },
        scene: {
            current: { id: 'fixed' },
            leave: jest.fn().mockResolvedValue(undefined),
            enter: jest.fn().mockResolvedValue(undefined),
        },
        ...overrides,
    } as any;
}

describe('FixedWizard', () => {
    const dateService = new DateService();
    const numberService = new NumberService();
    const wizardMessageService = new WizardMessageService();

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2026, 4, 12, 12));
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('accepts the lower date boundary', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new FixedWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createCtx({
            message: { text: '12/04/2026', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        categories: ['Membresia'],
                        accounts: ['CUENTA1'],
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.state.date).toBe('12/04/2026');
        expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('accepts the upper date boundary', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new FixedWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createCtx({
            message: { text: '12/05/2027', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        categories: ['Membresia'],
                        accounts: ['CUENTA1'],
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.state.date).toBe('12/05/2027');
        expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('rejects dates outside the allowed window', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new FixedWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createCtx({
            message: { text: '11/04/2026', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        categories: ['Membresia'],
                        accounts: ['CUENTA1'],
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.next).not.toHaveBeenCalled();
        expect(String((ctx.reply as jest.Mock).mock.calls[0][0])).toContain(
            'rango permitido',
        );
    });

    it('rejects account retries without exposing the configured list', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new FixedWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createCtx({
            message: { text: 'DESCONOCIDA', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        categories: ['Membresia'],
                        accounts: ['CUENTA1', 'CUENTA2'],
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step4(ctx);

        const reply = String((ctx.reply as jest.Mock).mock.calls[0][0]);
        expect(reply).not.toContain('CUENTA1');
        expect(reply).toContain('/cancelar');
    });

    it('rejects holder retries without exposing the configured list', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new FixedWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createCtx({
            message: { text: 'DESCONOCIDO', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        categories: ['Membresia'],
                        accounts: ['CUENTA1'],
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step5(ctx);

        const reply = String((ctx.reply as jest.Mock).mock.calls[0][0]);
        expect(reply).not.toContain('Tester');
        expect(reply).toContain('/cancelar');
    });

    it('rejects repetition counts outside the allowed range', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new FixedWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createCtx({
            message: { text: '13', from: { first_name: 'Tester' } },
            wizard: {
                state: {},
                next: jest.fn(),
            },
        });

        await wizard.step7(ctx);

        expect(ctx.wizard.next).not.toHaveBeenCalled();
        expect(String((ctx.reply as jest.Mock).mock.calls[0][0])).toContain(
            '1 y 12',
        );
    });

    it('creates repeated rows and notifies after each Excel write', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn().mockResolvedValue(undefined),
        };
        const wizard = new FixedWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createCtx({
            message: { from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        spreadsheet: { id: 'spreadsheet-id' },
                    },
                    date: '12/06/2026',
                    category: 'Membresia',
                    account: 'CUENTA1',
                    holder: 'Tester',
                    amount: 1000,
                    repetitions: 3,
                },
            },
        });

        await wizard.confirm(ctx);

        expect(sheetsService.appendBalanceRow).toHaveBeenCalledTimes(3);
        expect((ctx.reply as jest.Mock).mock.calls).toEqual(
            expect.arrayContaining([
                [expect.stringContaining('Repetición 1/3 agregada a Excel.')],
                [expect.stringContaining('Repetición 2/3 agregada a Excel.')],
                [expect.stringContaining('Repetición 3/3 agregada a Excel.')],
            ]),
        );
        expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('reports a partial failure when persistence breaks mid-run', async () => {
        const sheetsService = {
            appendBalanceRow: jest
                .fn()
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('write failed')),
        };
        const wizard = new FixedWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createCtx({
            message: { from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        spreadsheet: { id: 'spreadsheet-id' },
                    },
                    date: '12/06/2026',
                    category: 'Membresia',
                    account: 'CUENTA1',
                    holder: 'Tester',
                    amount: 1000,
                    repetitions: 3,
                },
            },
        });

        await wizard.confirm(ctx as any);

        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('No pude completar el registro.'),
        );
        expect(ctx.scene.leave).toHaveBeenCalled();
    });
});
