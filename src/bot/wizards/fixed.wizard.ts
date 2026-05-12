import { Command, Ctx, Hears, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Group } from 'src/schemas/group.schema';
import { SheetsService } from 'src/sheets/sheets.service';
import { DateService } from 'src/shared/services/date.service';
import { NumberService } from 'src/shared/services/number.service';
import { WizardMessageService } from 'src/shared/services/wizard-message.service';

@Wizard('fixed')
export class FixedWizard {
    constructor(
        private sheetsService: SheetsService,
        private dateService: DateService,
        private numberService: NumberService,
        private wizardMessageService: WizardMessageService,
    ) {}

    @WizardStep(1)
    async step1(@Ctx() ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        if (
            !group.categories?.length ||
            !group.accounts?.length ||
            !group.holders?.length
        ) {
            await ctx.reply(
                'Primero debés completar la configuración del grupo para usar suscripciones.',
            );
            await ctx.scene.leave();
            return;
        }

        await ctx.reply(
            this.wizardMessageService.buildDatePrompt(
                '🗓 ¿Cuál será la primera fecha de cobro? (dd/mm/yyyy)',
            ),
        );
        ctx.wizard.next();
    }

    @WizardStep(2)
    async step2(@Ctx() ctx: Scenes.WizardContext) {
        if (!ctx.message) {
            await ctx.reply(this.buildDateErrorMessage());
            return;
        }

        const resolvedDate = this.dateService.resolveDateInput(
            ctx.message['text'],
        );
        if (!resolvedDate) {
            await ctx.reply(this.buildDateErrorMessage());
            return;
        }

        if (!this.isWithinInclusiveWindow(resolvedDate)) {
            await ctx.reply(this.buildDateErrorMessage());
            return;
        }

        ctx.wizard.state['date'] = resolvedDate;
        await this.promptCategories(ctx);
        ctx.wizard.next();
    }

    @WizardStep(3)
    async step3(@Ctx() ctx: Scenes.WizardContext) {
        if (!ctx.message) {
            await ctx.reply(this.buildCategoryErrorMessage());
            return;
        }

        const group: Group = ctx.wizard.state['group'];
        const selected = Number(ctx.message['text']);
        if (
            Number.isInteger(selected) &&
            selected >= 0 &&
            selected < group.categories.length
        ) {
            ctx.wizard.state['category'] = group.categories[selected];
            await ctx.reply(
                `Categoría ${ctx.wizard.state['category']}. ¿Desde qué cuenta se cobrará?`,
            );
            ctx.wizard.next();
            return;
        }

        await ctx.reply(this.buildCategoryErrorMessage());
    }

    @WizardStep(4)
    async step4(@Ctx() ctx: Scenes.WizardContext) {
        if (!ctx.message) {
            await ctx.reply(this.buildAccountErrorMessage());
            return;
        }

        const group: Group = ctx.wizard.state['group'];
        const account = ctx.message['text'].trim().toUpperCase();
        if (group.accounts.some((value) => value === account)) {
            ctx.wizard.state['account'] = account;
            await ctx.reply('Cuenta registrada. ¿Quién es el titular?');
            ctx.wizard.next();
            return;
        }

        await ctx.reply(this.buildAccountErrorMessage());
    }

    @WizardStep(5)
    async step5(@Ctx() ctx: Scenes.WizardContext) {
        if (!ctx.message) {
            await ctx.reply(this.buildHolderErrorMessage());
            return;
        }

        const group: Group = ctx.wizard.state['group'];
        const holder = ctx.message['text'].trim();
        if (group.holders.some((value) => value === holder)) {
            ctx.wizard.state['holder'] = holder;
            await ctx.reply('Titular registrado. ¿Cuál es el monto del cobro?');
            ctx.wizard.next();
            return;
        }

        await ctx.reply(this.buildHolderErrorMessage());
    }

    @WizardStep(6)
    async step6(@Ctx() ctx: Scenes.WizardContext) {
        if (!ctx.message) {
            await ctx.reply(
                this.wizardMessageService.buildInvalidAmountMessage(
                    'Ingresá un monto mayor a 0.',
                ),
            );
            return;
        }

        const amount = this.numberService.toNumber(ctx.message['text']);
        if (amount <= 0) {
            await ctx.reply(
                this.wizardMessageService.buildInvalidAmountMessage(
                    'Ingresá un monto mayor a 0.',
                ),
            );
            return;
        }

        ctx.wizard.state['amount'] = amount;
        await ctx.reply('Monto registrado. ¿Qué descripción querés guardar?');
        ctx.wizard.next();
    }

    @WizardStep(7)
    async step7(@Ctx() ctx: Scenes.WizardContext) {
        if (!ctx.message) {
            await ctx.reply(this.buildDescriptionErrorMessage());
            return;
        }

        const description = ctx.message['text'].trim();
        if (!description) {
            await ctx.reply(this.buildDescriptionErrorMessage());
            return;
        }

        ctx.wizard.state['description'] = description;
        await ctx.reply(
            'Descripción registrada. ¿Cuántas repeticiones querés crear?',
        );
        ctx.wizard.next();
    }

    @WizardStep(8)
    async step8(@Ctx() ctx: Scenes.WizardContext) {
        if (!ctx.message) {
            await ctx.reply(this.buildRepetitionErrorMessage());
            return;
        }

        const repetitions = Number(ctx.message['text']);
        if (
            !Number.isInteger(repetitions) ||
            repetitions < 1 ||
            repetitions > 12
        ) {
            await ctx.reply(this.buildRepetitionErrorMessage());
            return;
        }

        ctx.wizard.state['repetitions'] = repetitions;
        await ctx.reply(
            `✅ Confirmo tus datos:
                Fecha inicial: ${ctx.wizard.state['date']}
                Categoría: ${ctx.wizard.state['category']}
                Cuenta: ${ctx.wizard.state['account']}
                Titular: ${ctx.wizard.state['holder']}
                Monto: ${ctx.wizard.state['amount']}
                Descripción: ${ctx.wizard.state['description']}
                Repeticiones: ${ctx.wizard.state['repetitions']}

            ¿Deseás confirmar? (sí/no)`,
        );
        ctx.wizard.next();
    }

    @WizardStep(9)
    @Hears(/sí|si|Si/i)
    async confirm(@Ctx() ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        const repetitions = ctx.wizard.state['repetitions'];
        const amount = ctx.wizard.state['amount'];
        const description = ctx.wizard.state['description'];
        const category = ctx.wizard.state['category'];
        const account = ctx.wizard.state['account'];
        const holder = ctx.wizard.state['holder'];
        const startDate = ctx.wizard.state['date'];
        const createdBy = ctx.message?.from.first_name ?? 'system';
        let persistedRows = 0;

        try {
            for (let index = 0; index < repetitions; index += 1) {
                const rowDate = this.dateService.addMonthsExactDDMMYYYY(
                    startDate,
                    index,
                );
                if (!rowDate) {
                    throw new Error('Unable to calculate fixed charge date');
                }

                const sheetArray = [
                    rowDate,
                    category,
                    `${description} ${index + 1} de ${repetitions}`,
                    account,
                    holder,
                    amount,
                    0,
                    createdBy,
                ];

                await this.sheetsService.appendBalanceRow(sheetArray, group);
                persistedRows += 1;
                await ctx.reply(
                    `✅ Repetición ${index + 1}/${repetitions} agregada a Excel.`,
                );
            }

            await ctx.reply('🎉 ¡Registro completado!');
            return ctx.scene.leave();
        } catch {
            await ctx.reply(
                persistedRows > 0
                    ? this.wizardMessageService.buildPartialPersistenceFailureMessage()
                    : this.wizardMessageService.buildPersistenceFailureMessage(),
            );
            return ctx.scene.leave();
        }
    }

    @WizardStep(9)
    @Hears(/no|No/i)
    async cancel(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.reply(
            '❌ Registro cancelado. Podés reiniciar con /suscripcion.',
        );
        return ctx.scene.leave();
    }

    @Command('cancelar')
    async cancelAll(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.scene?.current) {
            await ctx.reply(
                this.wizardMessageService.buildSceneCancelledMessage(),
            );
            await ctx.scene.leave();
        } else {
            await ctx.reply(
                this.wizardMessageService.buildNoActiveConversationMessage(),
            );
        }
    }

    private async promptCategories(ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        await ctx.reply(`Fecha inicial: ${ctx.wizard.state['date']}
¿Qué categoría corresponde? (Mandame solo el número.)
${group.categories.map((value, index) => `${index}. ${value}`).join('\n')}`);
    }

    private buildDateErrorMessage(): string {
        const { lowerBound, upperBound } = this.getAllowedDateWindow();
        return this.wizardMessageService.buildRetryMessage(
            'La fecha inicial no está dentro del rango permitido.',
            `Ingresá una fecha entre ${lowerBound} y ${upperBound}.`,
        );
    }

    private buildCategoryErrorMessage(): string {
        return this.wizardMessageService.buildRetryMessage(
            'La categoría ingresada no es válida.',
            'Ingresá nuevamente el número de una categoría.',
        );
    }

    private buildAccountErrorMessage(): string {
        return this.wizardMessageService.buildRetryMessage(
            'La cuenta ingresada no es válida.',
            'Ingresá nuevamente una cuenta configurada.',
        );
    }

    private buildHolderErrorMessage(): string {
        return this.wizardMessageService.buildRetryMessage(
            'El titular ingresado no es válido.',
            'Ingresá nuevamente un titular configurado.',
        );
    }

    private buildRepetitionErrorMessage(): string {
        return this.wizardMessageService.buildRetryMessage(
            'La cantidad de repeticiones no es válida.',
            'Ingresá un número entre 1 y 12.',
        );
    }

    private buildDescriptionErrorMessage(): string {
        return this.wizardMessageService.buildRetryMessage(
            'La descripción ingresada no es válida.',
            'Ingresá una descripción no vacía.',
        );
    }

    private getAllowedDateWindow(): {
        lowerBound: string;
        upperBound: string;
    } {
        const today = new Date();
        const todayLabel = this.dateService.formatDateToDDMMYYYY(today);
        const lowerBound =
            this.dateService.addMonthsExactDDMMYYYY(todayLabel, -1) ??
            todayLabel;
        const upperBound =
            this.dateService.addMonthsExactDDMMYYYY(todayLabel, 12) ??
            todayLabel;

        return { lowerBound, upperBound };
    }

    private isWithinInclusiveWindow(dateValue: string): boolean {
        const parsedValue = this.dateService.parseDateFromDDMMYYYY(dateValue);
        if (!parsedValue) {
            return false;
        }

        const { lowerBound, upperBound } = this.getAllowedDateWindow();
        const lowerDate = this.dateService.parseDateFromDDMMYYYY(lowerBound);
        const upperDate = this.dateService.parseDateFromDDMMYYYY(upperBound);
        if (!lowerDate || !upperDate) {
            return false;
        }

        const normalizedValue = this.normalizeDate(parsedValue);
        const normalizedLower = this.normalizeDate(lowerDate);
        const normalizedUpper = this.normalizeDate(upperDate);

        return (
            normalizedValue >= normalizedLower &&
            normalizedValue <= normalizedUpper
        );
    }

    private normalizeDate(date: Date): number {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized.getTime();
    }
}
