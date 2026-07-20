import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SheetsService } from 'src/sheets/sheets.service';
import { Group } from 'src/schemas/group.schema';
import { DateService } from 'src/shared/services/date/date.service';
import { NumberService } from 'src/shared/services/number/number.service';
import { WizardMessageService } from 'src/shared/services/wizard-message/wizard-message.service';

@Wizard('transfer')
export class TransferWizard {
    constructor(
        private sheetsService: SheetsService,
        private dateService: DateService,
        private numberService: NumberService,
        private wizardMessageService: WizardMessageService,
    ) {}

    @WizardStep(1)
    async step1(@Ctx() ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        if (!group.self_transfer_category) {
            await ctx.reply(
                'Primero debés configurar una categoría para transferencias entre cuentas propias.',
            );
            return ctx.scene.leave();
        }
        this.sheetsService.getObservableData(ctx.wizard.state['group']);
        await ctx.reply(
            this.wizardMessageService.buildDatePrompt(
                '🗓 ¿Cuál es la fecha de la transferencia? (dd/mm/yyyy)',
            ),
        );
        ctx.wizard.next();
    }

    @WizardStep(2)
    async step2(@Ctx() ctx: Scenes.WizardContext) {
        if (ctx.message) {
            const resolvedDate = this.dateService.resolveDateInput(
                ctx.message['text'],
            );
            if (resolvedDate) {
                ctx.wizard.state['date'] = resolvedDate;
                await ctx.reply(
                    `Fecha: ${ctx.wizard.state['date']} \n¿Desde que cuenta moviste el dinero?`,
                );
                ctx.wizard.next();
                return;
            }

            await ctx.reply(
                this.wizardMessageService.buildInvalidDateMessage(),
            );
        } else {
            await ctx.reply(
                this.wizardMessageService.buildInvalidDateMessage(),
            );
        }
    }

    @WizardStep(3)
    async step3(@Ctx() ctx: Scenes.WizardContext) {
        if (ctx.message) {
            const group: Group = ctx.wizard.state['group'];
            const message = ctx.message['text'].toUpperCase();
            if (group.accounts.find((x) => x == message)) {
                ctx.wizard.state['origin_account'] = message;
                await ctx.reply(
                    `Cuenta ${ctx.wizard.state['origin_account']} \n¿Quien es el titular de esa cuenta?`,
                );
                ctx.wizard.next();
            } else {
                await ctx.reply(
                    this.wizardMessageService.buildRetryMessage(
                        'La cuenta ingresada no es válida.',
                        'Seleccioná una cuenta de la lista.',
                        group.accounts.map((x) => `- ${x}`).join('\n'),
                    ),
                );
                return;
            }
        }
    }

    @WizardStep(4)
    async step4(@Ctx() ctx: Scenes.WizardContext) {
        if (ctx.message) {
            const group: Group = ctx.wizard.state['group'];
            const message = ctx.message;
            if (group.holders.find((x) => x == message['text'])) {
                ctx.wizard.state['origin_owner'] = message['text'];
                await ctx.reply(
                    `Titular: ${ctx.wizard.state['origin_owner']} \n¿A que cuenta moviste la plata?`,
                );
                ctx.wizard.next();
            } else {
                await ctx.reply(
                    this.wizardMessageService.buildRetryMessage(
                        'El titular ingresado no es válido.',
                        'Ingresá nuevamente uno de los titulares configurados.',
                        group.holders.map((x) => `- ${x}`).join('\n'),
                    ),
                );
                return;
            }
        }
    }

    @WizardStep(5)
    async step5(@Ctx() ctx: Scenes.WizardContext) {
        if (ctx.message) {
            const group: Group = ctx.wizard.state['group'];
            const message = ctx.message['text'].toUpperCase();
            if (group.accounts.find((x) => x == message)) {
                ctx.wizard.state['final_account'] = message;
                await ctx.reply(
                    `Cuenta ${ctx.wizard.state['final_account']} \n¿Quien es el titular de esa cuenta?`,
                );
                ctx.wizard.next();
            } else {
                await ctx.reply(
                    this.wizardMessageService.buildRetryMessage(
                        'La cuenta ingresada no es válida.',
                        'Seleccioná una cuenta de la lista.',
                        group.accounts.map((x) => `- ${x}`).join('\n'),
                    ),
                );
                return;
            }
        }
    }

    @WizardStep(6)
    async step6(@Ctx() ctx: Scenes.WizardContext) {
        if (ctx.message) {
            const group: Group = ctx.wizard.state['group'];
            const message = ctx.message;
            if (group.holders.find((x) => x == message['text'])) {
                ctx.wizard.state['final_owner'] = message['text'];
                await ctx.reply(
                    `Titular: ${ctx.wizard.state['final_owner']} \n¿De cuanto fue la transferencia?`,
                );
                ctx.wizard.next();
            } else {
                await ctx.reply(
                    this.wizardMessageService.buildRetryMessage(
                        'El titular ingresado no es válido.',
                        'Ingresá nuevamente uno de los titulares configurados.',
                        group.holders.map((x) => `- ${x}`).join('\n'),
                    ),
                );
                return;
            }
        }
    }

    @WizardStep(7)
    async step7(@Ctx() ctx: Scenes.WizardContext) {
        if (ctx.message) {
            const debit = this.numberService.toNumber(ctx.message['text']);
            if (debit < 0) {
                await ctx.reply(
                    this.wizardMessageService.buildInvalidAmountMessage(
                        'Ingresá un número válido mayor o igual a 0.',
                    ),
                );
                return;
            }
            const group: Group = ctx.wizard.state['group'];
            ctx.wizard.state['debit'] = debit;
            ctx.wizard.state['created_by'] = ctx.message.from.first_name;
            await ctx.reply(
                `✅ Confirmo tus datos:
                Fecha: ${ctx.wizard.state['date']}
                Categoria: ${group.self_transfer_category}
                Descripcion: ${ctx.wizard.state['origin_account']} to ${ctx.wizard.state['final_account']}
                Cuenta: ${ctx.wizard.state['origin_account']}
                Titular: ${ctx.wizard.state['origin_owner']}
                Debito: ${ctx.wizard.state['debit']}
                Credito: 0
                Creado por: ${ctx.wizard.state['created_by']}

            Destino:
                Fecha: ${ctx.wizard.state['date']}
                Categoria: ${group.self_transfer_category}
                Descripcion: ${ctx.wizard.state['origin_account']} to ${ctx.wizard.state['final_account']}
                Cuenta: ${ctx.wizard.state['final_account']}
                Titular: ${ctx.wizard.state['final_owner']}
                Debito: 0
                Credito: ${ctx.wizard.state['debit']}
                Creado por: ${ctx.wizard.state['created_by']}
                
            ¿Deseás confirmar? (sí/no)`,
            );
            ctx.wizard.next();
        }
    }

    @WizardStep(9)
    @Hears(/sí|si|Si/i)
    async confirm(@Ctx() ctx: Scenes.WizardContext) {
        const group = ctx.wizard.state['group'];
        let persistedRows = 0;
        const debitArray = [
            ctx.wizard.state['date'],
            group.self_transfer_category,
            `${ctx.wizard.state['origin_account']} to ${ctx.wizard.state['final_account']}`,
            ctx.wizard.state['origin_account'],
            ctx.wizard.state['origin_owner'],
            ctx.wizard.state['debit'],
            0,
            ctx.wizard.state['created_by'],
        ];
        const creditArray = [
            ctx.wizard.state['date'],
            group.self_transfer_category,
            `${ctx.wizard.state['origin_account']} to ${ctx.wizard.state['final_account']}`,
            ctx.wizard.state['final_account'],
            ctx.wizard.state['final_owner'],
            0,
            ctx.wizard.state['debit'],
            ctx.wizard.state['created_by'],
        ];

        try {
            await this.sheetsService.appendBalanceRow(debitArray, group);
            persistedRows += 1;
            await this.sheetsService.appendBalanceRow(creditArray, group);
            await ctx.reply('🎉 ¡Registro completado!');
            return ctx.scene.leave();
        } catch {
            await ctx.reply(
                persistedRows > 0
                    ? this.wizardMessageService.buildPartialPersistenceFailureMessage()
                    : this.wizardMessageService.buildPersistenceFailureMessage(),
            );
            return;
        }
    }

    @WizardStep(9)
    @Hears(/no|No/i)
    async cancel(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.reply(
            '❌ Registro cancelado. Podés reiniciar con /registrar.',
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
}
