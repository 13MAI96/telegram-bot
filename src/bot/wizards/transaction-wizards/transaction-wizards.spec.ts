import { BillWizard } from '../bill/bill.wizard';
import { IncomeWizard } from '../income/income.wizard';
import { TransferWizard } from '../transfer/transfer.wizard';
import { InstallmentWizard } from '../instalment/instalment.wizard';
import { PlaneTextWizard } from '../plane-text/plane-text.wizard';
import { PlainIncomeWizard } from '../plain-income/plain-income.wizard';
import { TransactionsWizard } from '../transactions/transactions.wizard';
import { DateService } from 'src/shared/services/date/date.service';
import { NumberService } from 'src/shared/services/number/number.service';
import { PlainTextTransactionService } from 'src/shared/services/plain-text-transaction/plain-text-transaction.service';
import { WizardMessageService } from 'src/shared/services/wizard-message/wizard-message.service';

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
    const plainTextTransactionService = new PlainTextTransactionService(
        dateService,
        numberService,
    );
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

    it('bill accepts a debit amount of 0 and advances to confirmation', async () => {
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
            message: { text: '0', from: { first_name: 'Tester' } },
            wizard: {
                state: {},
                next: jest.fn(),
            },
        });

        await wizard.step7(ctx);

        expect(ctx.wizard.state.debit).toBe(0);
        expect(ctx.wizard.state.credit).toBe(0);
        expect(ctx.wizard.next).toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Debito: 0'),
        );
    });

    it('income accepts a credit amount of 0 and advances to confirmation', async () => {
        const sheetsService = {
            getObservableData: jest.fn(),
            appendBalanceRow: jest.fn(),
        };
        const wizard = new IncomeWizard(
            sheetsService as any,
            dateService,
            numberService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: '0', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    date: '12/05/2026',
                    category: 'Sueldo',
                    description: 'Cobro',
                    account: 'BANCO',
                    owner: 'Tester',
                },
                next: jest.fn(),
            },
        });

        await wizard.step7(ctx);

        expect(ctx.wizard.state.debit).toBe(0);
        expect(ctx.wizard.state.credit).toBe(0);
        expect(ctx.wizard.next).toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Credito: 0'),
        );
    });

    it('transfer accepts a debit amount of 0', async () => {
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
            message: { text: '0', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: { self_transfer_category: 'Transferencias propias' },
                    date: '12/05/2026',
                    origin_account: 'CAJA',
                    origin_owner: 'Tester',
                    final_account: 'BANCO',
                    final_owner: 'Tester',
                },
                next: jest.fn(),
            },
        });

        await wizard.step7(ctx);

        expect(ctx.wizard.state.debit).toBe(0);
        expect(ctx.wizard.next).toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Debito: 0'),
        );
    });

    it('instalment accepts a total amount of 0', async () => {
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
            message: { text: '0', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    instalments: 3,
                    date: '12/05/2026',
                    category: 'Tarjeta',
                    description: 'Compra',
                    account: 'BANCO',
                    owner: 'Tester',
                },
                next: jest.fn(),
            },
        });

        await wizard.step7(ctx);

        expect(ctx.wizard.state.debit).toBe(0);
        expect(ctx.wizard.state.instalment_dates).toEqual([
            '12/05/2026',
            '12/06/2026',
            '12/07/2026',
        ]);
        expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('plane-text accepts a debit amount of 0', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new PlaneTextWizard(
            sheetsService as any,
            plainTextTransactionService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: {
                text: 'hoy,comida,Cafe,0,efectivo,tester',
                from: { first_name: 'Tester' },
            },
            wizard: {
                state: {
                    group: {
                        categories: ['Comida'],
                        accounts: ['EFECTIVO'],
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.state.date).toBe('12/05/2026');
        expect(ctx.wizard.state.category).toBe('Comida');
        expect(ctx.wizard.state.account).toBe('EFECTIVO');
        expect(ctx.wizard.state.holder).toBe('Tester');
        expect(ctx.wizard.state.debit).toBe(0);
        expect(ctx.wizard.state.credit).toBe(0);
        expect(ctx.wizard.next).toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Debito: 0'),
        );
    });

    it('plain-income accepts a credit amount and canonicalizes text fields', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new PlainIncomeWizard(
            sheetsService as any,
            plainTextTransactionService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: {
                text: 'ayer,sueldo,Cobro,1250,banco,tester',
                from: { first_name: 'Tester' },
            },
            wizard: {
                state: {
                    group: {
                        categories: ['Sueldo'],
                        accounts: ['BANCO'],
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.state.date).toBe('11/05/2026');
        expect(ctx.wizard.state.category).toBe('Sueldo');
        expect(ctx.wizard.state.account).toBe('BANCO');
        expect(ctx.wizard.state.holder).toBe('Tester');
        expect(ctx.wizard.state.debit).toBe(0);
        expect(ctx.wizard.state.credit).toBe(1250);
        expect(ctx.wizard.next).toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Credito: 1250'),
        );
    });

    it('plane-text asks for the complete payload again when data is invalid', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new PlaneTextWizard(
            sheetsService as any,
            plainTextTransactionService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: {
                text: 'hoy,Inexistente,Cafe,100,EFECTIVO,Tester',
                from: { first_name: 'Tester' },
            },
            wizard: {
                state: {
                    group: {
                        categories: ['Comida'],
                        accounts: ['EFECTIVO'],
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.next).not.toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Volvé a enviar el texto completo.'),
        );
    });

    it('plain-income rejects non-numeric amounts', async () => {
        const sheetsService = {
            appendBalanceRow: jest.fn(),
        };
        const wizard = new PlainIncomeWizard(
            sheetsService as any,
            plainTextTransactionService,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: {
                text: 'hoy,Sueldo,Cobro,abc,BANCO,Tester',
                from: { first_name: 'Tester' },
            },
            wizard: {
                state: {
                    group: {
                        categories: ['Sueldo'],
                        accounts: ['BANCO'],
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.next).not.toHaveBeenCalled();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('El monto debe ser numérico.'),
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
            plainTextTransactionService,
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
                    credit: 0,
                    created_by: 'Tester',
                },
            },
        });

        await wizard.confirm(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('No pude guardar la operación.'),
        );
        expect(ctx.reply).not.toHaveBeenCalledWith('🎉 ¡Registro completado!');
        expect(ctx.scene.leave).not.toHaveBeenCalled();
    });

    it('transactions validates account case-insensitively', async () => {
        const sheetsService = {
            getLatestCashMovements: jest.fn(),
        };
        const wizard = new TransactionsWizard(
            sheetsService as any,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: 'efectivo', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    group: {
                        accounts: ['EFECTIVO'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step2(ctx);

        expect(ctx.wizard.state.account).toBe('EFECTIVO');
        expect(ctx.wizard.next).toHaveBeenCalled();
    });

    it('transactions formats movements and omits zero values', async () => {
        const sheetsService = {
            getLatestCashMovements: jest.fn().mockResolvedValue([
                {
                    date: '12/05/2026',
                    description: 'Cafe',
                    account: 'EFECTIVO',
                    holder: 'Tester',
                    debit: 100,
                    credit: 0,
                },
                {
                    date: '11/05/2026',
                    description: 'Sueldo',
                    account: 'EFECTIVO',
                    holder: 'Tester',
                    debit: 0,
                    credit: 500,
                },
            ]),
        };
        const wizard = new TransactionsWizard(
            sheetsService as any,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: 'tester', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    account: 'EFECTIVO',
                    group: {
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step3(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
            '12/05/2026 - Cafe - Deb.: 100\n11/05/2026 - Sueldo - Cred.: 500',
        );
        expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('transactions reports empty results', async () => {
        const sheetsService = {
            getLatestCashMovements: jest.fn().mockResolvedValue([]),
        };
        const wizard = new TransactionsWizard(
            sheetsService as any,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: 'Tester', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    account: 'EFECTIVO',
                    group: {
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step3(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
            'No encontré movimientos para esa cuenta y titular.',
        );
        expect(ctx.scene.leave).toHaveBeenCalled();
    });

    it('transactions reports spreadsheet lookup failures', async () => {
        const sheetsService = {
            getLatestCashMovements: jest
                .fn()
                .mockRejectedValue(new Error('read failed')),
        };
        const wizard = new TransactionsWizard(
            sheetsService as any,
            wizardMessageService,
        );
        const ctx = createWizardContext({
            message: { text: 'Tester', from: { first_name: 'Tester' } },
            wizard: {
                state: {
                    account: 'EFECTIVO',
                    group: {
                        holders: ['Tester'],
                    },
                },
                next: jest.fn(),
            },
        });

        await wizard.step3(ctx);

        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('No pude consultar los movimientos.'),
        );
        expect(ctx.scene.leave).toHaveBeenCalled();
    });
});
