import { Command, Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Group } from 'src/schemas/group.schema';
import { SheetsService } from 'src/sheets/sheets.service';
import { TransactionMovement } from 'src/sheets/transaction-movement.model';
import { WizardMessageService } from 'src/shared/services/wizard-message/wizard-message.service';

@Wizard('transactions')
export class TransactionsWizard {
    constructor(
        private sheetsService: SheetsService,
        private wizardMessageService: WizardMessageService,
    ) {}

    @WizardStep(1)
    async step1(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.reply('¿De qué cuenta querés ver movimientos?');
        ctx.wizard.next();
    }

    @WizardStep(2)
    async step2(@Ctx() ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        const account = this.findCanonical(
            ctx.message?.['text'],
            group.accounts,
        );
        if (!account) {
            await ctx.reply(
                this.wizardMessageService.buildRetryMessage(
                    'La cuenta ingresada no es válida.',
                    'Seleccioná una cuenta de la lista.',
                    group.accounts.map((value) => `- ${value}`).join('\n'),
                ),
            );
            return;
        }

        ctx.wizard.state['account'] = account;
        await ctx.reply(`Cuenta: ${account}\n¿Quién es el titular?`);
        ctx.wizard.next();
    }

    @WizardStep(3)
    async step3(@Ctx() ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        const holder = this.findCanonical(ctx.message?.['text'], group.holders);
        if (!holder) {
            await ctx.reply(
                this.wizardMessageService.buildRetryMessage(
                    'El titular ingresado no es válido.',
                    'Ingresá nuevamente uno de los titulares configurados.',
                    group.holders.map((value) => `- ${value}`).join('\n'),
                ),
            );
            return;
        }

        ctx.wizard.state['holder'] = holder;

        try {
            const movements = await this.sheetsService.getLatestCashMovements(
                group,
                ctx.wizard.state['account'],
                holder,
            );

            if (movements.length === 0) {
                await ctx.reply(
                    'No encontré movimientos para esa cuenta y titular.',
                );
                return ctx.scene.leave();
            }

            await ctx.reply(
                movements
                    .map((movement) => this.formatMovement(movement))
                    .join('\n'),
            );
            return ctx.scene.leave();
        } catch {
            await ctx.reply(
                'No pude consultar los movimientos.\nIntentá nuevamente en unos minutos.\nPodés cancelar con /cancelar.',
            );
            return ctx.scene.leave();
        }
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

    private findCanonical(
        value: string | undefined,
        options: string[] | undefined,
    ): string | undefined {
        if (!value) {
            return undefined;
        }

        return options?.find(
            (option) => option.toLowerCase() === value.trim().toLowerCase(),
        );
    }

    private formatMovement(movement: TransactionMovement): string {
        const parts = [`${movement.date} - ${movement.description}`];
        if (movement.debit !== 0) {
            parts.push(`Deb.: ${movement.debit}`);
        }
        if (movement.credit !== 0) {
            parts.push(`Cred.: ${movement.credit}`);
        }

        return parts.join(' - ');
    }
}
