import { BillWizard } from './bill.wizard';
import { TransferWizard } from './transfer.wizard';
import { InstallmentWizard } from './instalment.wizard';
import { PlaneTextWizard } from './plane-text.wizard';
import { DateService } from 'src/shared/services/date.service';
import { NumberService } from 'src/shared/services/number.service';
import { WizardMessageService } from 'src/shared/services/wizard-message.service';

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
            current: { id: 'test-scene' },
        },
        ...overrides,
    } as any;
}

describe('Transaction wizards', () => {
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

    it('bill accepts sig <dia> and advances with the resolved date', async () => {
        const sheetsService = {
            getObservableData: jest.fn(),
            appendBalanceRow: jest.fn(),
        };
        const wizard = new BillWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: 'sig 31', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: { categories: ['Comida', 'Transporte'] },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.state.date).toBe('30/06/2026');
        expect(ctx.wizard.next).toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Fecha: 30/06/2026'),
        );
    });

    it('transfer accepts ayer and advances with the resolved date', async () => {
        const sheetsService = {
            getObservableData: jest.fn(),
            appendBalanceRow: jest.fn(),
        };
        const wizard = new TransferWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: 'ayer', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {},
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.state.date).toBe('11/05/2026');
        expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('instalment accepts hoy and advances with the resolved date', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new InstallmentWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: 'hoy', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: { instalment_categories: ['Tarjeta'] },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.state.date).toBe('12/05/2026');
        expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('transfer invalid account guidance includes the cancel command', async () => {
        const sheetsService = {
            getObservableData: jest.fn(),
            appendBalanceRow: jest.fn(),
        };
        const wizard = new TransferWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: 'desconocida', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: { accounts: ['EFECTIVO', 'BANCO'] },
                },
                next: jest.fn(),
            },
        });

        await wizard.step3(ctx);

        expect(ctx.wizard.next).not.toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('/cancelar'),
        );
    });

    it('instalment invalid date guidance includes the cancel command', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new InstallmentWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: 'mañana', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: { instalment_categories: ['Tarjeta'] },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.next).not.toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('/cancelar'),
        );
    });

    it('plane-text reports persistence failures without claiming success', async () => {
        const sheetsService = {
            appendBalanceRow: jest
                .fn()
                .mockRejectedValue(new Error('write failed')),
        };
        const wizard = new PlaneTextWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            wizard: {
                state: {
                    group: { spreadsheet: { id: 'sheet-id' } },
                    date: '12/05/2026',
                    category: 'Comida',
                    description: 'Cafe',
                    account: 'EFECTIVO',
                    holder: 'Tester',
                    debit: 100,
                    created_by: 'Tester',
                },
            },
        });

        await wizard.step2(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('No pude guardar la operación.'),
        );
        expect(ctx.reply).not.toHaveBeenCalledWith('🎉 ¡Registro completado!');
        expect(ctx.scene.leave).not.toHaveBeenCalled();
    });
});
