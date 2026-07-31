import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
    Update,
    Start,
    Help,
    Hears,
    Ctx,
    Command,
    InjectBot,
} from 'nestjs-telegraf';
import { GroupService } from 'src/group/group.service';
import { Context, Scenes, Telegraf } from 'telegraf';

@Update()
export class BotUpdate implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BotUpdate.name);

    constructor(
        private groupService: GroupService,
        @InjectBot() private readonly bot: Telegraf,
    ) {}

    /**
     * Bot inicialization process
     * @function onModuleInit try to clean previous opened webhook.
     * @function onModuleDestroy try to finish a current webhook before close the app.
     * @function startWithRetry will try to launch the bot, if there is a error 409, that means another webhook still working, this function set a timer to try again.
     */

    async onModuleInit() {
        const initStartedAt = Date.now();
        this.logger.log('Telegram activity tracking is enabled');

        this.bot.catch(async (err, ctx) => {
            const wizardContext = ctx as Scenes.SceneContext;
            const sceneId = wizardContext.scene?.current?.id ?? 'none';
            const userId = ctx.from?.id ?? 'unknown';

            this.logger.error(
                `Unhandled bot error for scene=${sceneId} user=${userId}`,
                err instanceof Error ? err.stack : String(err),
            );

            try {
                await ctx.reply(
                    'Ocurrió un error inesperado.\nIntentá nuevamente.\nPodés cancelar con /cancelar.',
                );
                if (wizardContext.scene?.current) {
                    await wizardContext.scene.leave();
                }
            } catch (replyError) {
                this.logger.error(
                    'Failed to send bot error response',
                    replyError instanceof Error
                        ? replyError.stack
                        : String(replyError),
                );
            }
        });

        this.logger.log(
            `Bot module init completed in ${Date.now() - initStartedAt}ms; Telegram startup continues in background`,
        );

        void this.initializeBotInBackground();
    }

    async onModuleDestroy() {
        await this.bot.stop();
    }

    private async initializeBotInBackground() {
        try {
            const deleteWebhookStartedAt = Date.now();
            this.logger.log('Deleting Telegram webhook before bot launch');
            await this.bot.telegram.deleteWebhook({
                drop_pending_updates: true,
            });
            this.logger.log(
                `Telegram webhook deleted in ${Date.now() - deleteWebhookStartedAt}ms`,
            );

            await this.startWithRetry();
        } catch (err) {
            this.logger.error(
                'Telegram background initialization failed',
                err instanceof Error ? err.stack : String(err),
            );
        }
    }

    private async startWithRetry(delay = 30000) {
        const launchStartedAt = Date.now();

        try {
            this.logger.log('Launching Telegram bot');
            await this.bot.launch();
            this.logger.log(
                `Telegram bot launch completed in ${Date.now() - launchStartedAt}ms`,
            );
        } catch (err) {
            if (err.code === 409) {
                this.logger.warn(
                    `Telegram bot launch returned 409 after ${Date.now() - launchStartedAt}ms; retrying in ${delay / 1000}s`,
                );
                setTimeout(() => this.startWithRetry(delay), delay);
                return;
            }

            this.logger.error(
                `Telegram bot launch failed after ${Date.now() - launchStartedAt}ms`,
                err instanceof Error ? err.stack : String(err),
            );
            throw err;
        }
    }

    /**
     * Bot commads and listenings.
     */

    /**
     * @function start return a default message.
     */
    @Start()
    async start(@Ctx() ctx: Context) {
        await ctx.reply('👋 ¡Hola! Soy MAI tu bot de Telegram.');
    }

    /**
     * @function help must return a list of command and options for use bot's functionalities.
     */
    @Help()
    async help(@Ctx() ctx: Context) {
        await ctx.reply(`
Estos son los comandos disponibles:
/gasto - Iniciar
/ingreso - Registrar ingreso
/gasto_plano - Registrar gasto con texto plano
/ingreso_plano - Registrar ingreso con texto plano
/transactions - Consultar últimos movimientos por cuenta y titular
/suscripcion - Cobro fijo recurrente
/help - Ayuda
`);
    }

    @Hears('Hola')
    async hearsHola(@Ctx() ctx: Context) {
        if (ctx.message) {
            await ctx.reply(`¡Hola ${ctx.message.from.first_name ?? ''}! 😄`);
            await ctx.reply(
                `Selecciona un comando para iniciar, o /config si no tienes grupo asignado`,
            );
        }
    }

    /**
     * @function config open the configuration wizard
     */
    @Command('config')
    async startConfig(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('config', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    @Command('gasto')
    async startBill(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('bill', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    @Command('ingreso')
    async startIncome(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('income', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    @Hears(/^\/gasto_plano(?:\s|$)/)
    async startPlainBill(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('plane-text', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    @Hears(/^\/ingreso_plano(?:\s|$)/)
    async startPlainIncome(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('plain-income', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    @Command('cuotas')
    async startInstalment(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('instalment', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    @Command('suscripcion')
    @Command('fijo')
    async fixedCost(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('fixed', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    @Command('transferencia')
    async transfer(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('transfer', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    @Hears(/mayores/i)
    async maestros(@Ctx() ctx: Scenes.SceneContext) {
        await ctx.scene.enter('espe');
    }

    @Command('saldos')
    @Command('balance')
    async balance(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('balance', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    @Command('transacciones')
    async transactions(@Ctx() ctx: Scenes.SceneContext) {
        if (ctx.message?.from.id) {
            const group = await this.groupService.hasAssignedGroup(
                `${ctx.message?.from.id}`,
            );
            if (group) {
                await ctx.scene.enter('transactions', { group: group });
            } else {
                await ctx.scene.enter('new-group');
            }
        }
    }

    async planeTextManager(@Ctx() ctx: Scenes.SceneContext) {
        return;
    }
}
