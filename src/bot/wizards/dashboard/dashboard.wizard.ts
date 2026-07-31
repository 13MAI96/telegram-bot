import { Logger } from '@nestjs/common';
import { Command, Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Group } from 'src/schemas/group.schema';
import { SheetsService } from 'src/sheets/sheets.service';
import { DashboardDataService } from 'src/shared/services/dashboard/dashboard-data.service';
import { PieChartImageService } from 'src/shared/services/dashboard/pie-chart-image.service';
import {
    DashboardFilters,
    DashboardMonth,
    ExpenseCategoryDashboard,
} from 'src/shared/types/dashboard.types';
import { WizardMessageService } from 'src/shared/services/wizard-message/wizard-message.service';

@Wizard('dashboard')
export class DashboardWizard {
    private readonly logger = new Logger(DashboardWizard.name);

    constructor(
        private sheetsService: SheetsService,
        private dashboardDataService: DashboardDataService,
        private pieChartImageService: PieChartImageService,
        private wizardMessageService: WizardMessageService,
    ) {}

    @WizardStep(1)
    async step1(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.reply(
            '¿Qué mes querés ver? Podés usar mm/yyyy, este_mes, mes_pasado o el nombre del mes.',
        );
        ctx.wizard.next();
    }

    @WizardStep(2)
    async step2(@Ctx() ctx: Scenes.WizardContext) {
        const month = this.dashboardDataService.parseMonth(
            ctx.message?.['text'],
        );
        if (!month) {
            await ctx.reply(
                this.wizardMessageService.buildRetryMessage(
                    'Mes inválido.',
                    'Ingresá el mes como mm/yyyy, este_mes, mes_pasado o nombre del mes.',
                ),
            );
            return;
        }

        ctx.wizard.state['month'] = month;
        const group: Group = ctx.wizard.state['group'];
        await ctx.reply(
            `Mes: ${month.label}\n¿Qué titulares querés incluir? Usá todos o nombres separados por coma.\n${group.holders
                .map((holder) => `- ${holder}`)
                .join('\n')}`,
        );
        ctx.wizard.next();
    }

    @WizardStep(3)
    async step3(@Ctx() ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        const result = this.dashboardDataService.parseSelection(
            ctx.message?.['text'],
            group.holders,
        );

        if (!result.values || result.invalidValues) {
            await ctx.reply(
                this.wizardMessageService.buildRetryMessage(
                    `Titular inválido: ${(result.invalidValues ?? []).join(', ')}`,
                    'Enviá todos o titulares separados por coma.',
                    group.holders.map((holder) => `- ${holder}`).join('\n'),
                ),
            );
            return;
        }

        ctx.wizard.state['holders'] = result.values;
        ctx.wizard.state['allHolders'] = result.all ?? false;
        await ctx.reply(
            `¿Qué cuentas querés incluir? Usá todos o nombres separados por coma.\n${group.accounts
                .map((account) => `- ${account}`)
                .join('\n')}`,
        );
        ctx.wizard.next();
    }

    @WizardStep(4)
    async step4(@Ctx() ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        const result = this.dashboardDataService.parseSelection(
            ctx.message?.['text'],
            group.accounts,
        );

        if (!result.values || result.invalidValues) {
            await ctx.reply(
                this.wizardMessageService.buildRetryMessage(
                    `Cuenta inválida: ${(result.invalidValues ?? []).join(', ')}`,
                    'Enviá todos o cuentas separadas por coma.',
                    group.accounts.map((account) => `- ${account}`).join('\n'),
                ),
            );
            return;
        }

        ctx.wizard.state['accounts'] = result.values;
        ctx.wizard.state['allAccounts'] = result.all ?? false;
        await this.generateDashboard(ctx);
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

    private async generateDashboard(ctx: Scenes.WizardContext) {
        const group: Group = ctx.wizard.state['group'];
        const month: DashboardMonth = ctx.wizard.state['month'];
        const filters: DashboardFilters = {
            holders: ctx.wizard.state['holders'],
            accounts: ctx.wizard.state['accounts'],
            allHolders: ctx.wizard.state['allHolders'],
            allAccounts: ctx.wizard.state['allAccounts'],
        };

        let dashboard: ExpenseCategoryDashboard;
        try {
            const movements = await this.sheetsService.getCashMovements(group);
            dashboard = this.dashboardDataService.aggregateExpenseCategories(
                movements,
                month,
                filters,
            );
        } catch {
            await ctx.reply(
                'No pude consultar los datos del dashboard.\nIntentá nuevamente en unos minutos.\nPodés cancelar con /cancelar.',
            );
            return ctx.scene.leave();
        }

        if (dashboard.categories.length === 0) {
            await ctx.reply(
                'No encontré gastos para el mes y filtros seleccionados.',
            );
            return ctx.scene.leave();
        }

        const fallback = this.dashboardDataService.formatFallback(dashboard);
        try {
            const image =
                this.pieChartImageService.renderExpensePieChart(dashboard);
            await ctx.replyWithPhoto(
                { source: image },
                { caption: this.dashboardDataService.formatCaption(dashboard) },
            );
            return ctx.scene.leave();
        } catch (error) {
            this.logger.error(
                'Failed to render or send dashboard chart',
                error instanceof Error ? error.stack : String(error),
            );
            await ctx.reply(fallback);
            return ctx.scene.leave();
        }
    }
}
