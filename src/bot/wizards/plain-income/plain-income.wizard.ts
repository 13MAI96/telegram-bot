import { Command, Ctx, Hears, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Group } from 'src/schemas/group.schema';
import { SheetsService } from 'src/sheets/sheets.service';
import { PlainTextTransactionService } from 'src/shared/services/plain-text-transaction/plain-text-transaction.service';
import { WizardMessageService } from 'src/shared/services/wizard-message/wizard-message.service';
import { PlainTextTransactionPayload } from 'src/shared/types/plain-text-transaction.types';

@Wizard('plain-income')
export class PlainIncomeWizard {
    constructor(
        private sheetsService: SheetsService,
        private plainTextTransactionService: PlainTextTransactionService,
        private wizardMessageService: WizardMessageService,
    ) {}

    @WizardStep(1)
    async step1(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.reply(this.buildPayloadPrompt());
        ctx.wizard.next();
    }

    @WizardStep(2)
    async step2(@Ctx() ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        const result = this.plainTextTransactionService.parse(
            ctx.message?.['text'],
            group,
        );

        if (!result.payload) {
            await ctx.reply(
                this.wizardMessageService.buildRetryMessage(
                    `🚫 Datos inválidos. ${result.error}`,
                    'Volvé a enviar el texto completo.',
                    this.buildPayloadPrompt(),
                ),
            );
            return;
        }

        this.setState(ctx, result.payload);
        await ctx.reply(this.buildConfirmationMessage(ctx));
        ctx.wizard.next();
    }

    @WizardStep(3)
    @Hears(/sí|si|Si/i)
    async confirm(@Ctx() ctx: Scenes.WizardContext) {
        const group = ctx.wizard.state['group'];
        const sheetArray = [
            ctx.wizard.state['date'],
            ctx.wizard.state['category'],
            ctx.wizard.state['description'],
            ctx.wizard.state['account'],
            ctx.wizard.state['holder'],
            ctx.wizard.state['debit'],
            ctx.wizard.state['credit'],
            ctx.wizard.state['created_by'],
        ];

        try {
            await this.sheetsService.appendBalanceRow(sheetArray, group);
            await ctx.reply('🎉 ¡Registro completado!');
            return ctx.scene.leave();
        } catch {
            await ctx.reply(
                this.wizardMessageService.buildPersistenceFailureMessage(),
            );
            return;
        }
    }

    @WizardStep(3)
    @Hears(/no|No/i)
    async cancel(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.reply('❌ Registro cancelado.');
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

    private setState(
        ctx: Scenes.WizardContext,
        payload: PlainTextTransactionPayload,
    ) {
        ctx.wizard.state['date'] = payload.date;
        ctx.wizard.state['category'] = payload.category;
        ctx.wizard.state['description'] = payload.description;
        ctx.wizard.state['account'] = payload.account;
        ctx.wizard.state['holder'] = payload.holder;
        ctx.wizard.state['debit'] = 0;
        ctx.wizard.state['credit'] = payload.amount;
        ctx.wizard.state['created_by'] = ctx.message?.from.first_name;
    }

    private buildConfirmationMessage(ctx: Scenes.WizardContext): string {
        return `
Este es el ingreso que detecté:
            Fecha: ${ctx.wizard.state['date']}
            Categoria: ${ctx.wizard.state['category']}
            Descripcion: ${ctx.wizard.state['description']}
            Cuenta: ${ctx.wizard.state['account']}
            Titular: ${ctx.wizard.state['holder']}
            Debito: ${ctx.wizard.state['debit']}
            Credito: ${ctx.wizard.state['credit']}
            Creado por: ${ctx.wizard.state['created_by']}
                
¿Deseás confirmar? (sí/no)
                `;
    }

    private buildPayloadPrompt(): string {
        return 'Enviame el ingreso con este formato: fecha, categoria, descripcion, monto, cuenta, titular';
    }
}
