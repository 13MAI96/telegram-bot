import { Update, Start, Help, On, Hears, Ctx, Command } from 'nestjs-telegraf';
import { Context, Scenes } from 'telegraf';


@Update()
export class BotUpdate {

  @Start()
  async start(@Ctx() ctx: Context) {
    await ctx.reply('👋 ¡Hola! Soy MAI tu bot de Telegram.');
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    await ctx.reply('Estos son los comandos disponibles:\n/gasto - Iniciar\n/help - Ayuda');
  }

  @Hears('Hola')
  async hearsHola(@Ctx() ctx: Context) {
    await ctx.reply('¡Hola humano! 😄');
  }

  @Command('gasto')
  async startBill(@Ctx() ctx: Scenes.SceneContext) {
    await ctx.scene.enter('new-bill')
  }

  @Command('cuotas')
  async startInstalment(@Ctx() ctx: Scenes.SceneContext) {
    await ctx.scene.enter('new-instalment')
  }

  @Command('fijo')
  async ficexCost(@Ctx() ctx: Scenes.SceneContext) {
    // await ctx.scene.enter('new-instalment')
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
        await ctx.reply('Utiliza un comando del menu para comenzar.');
  }

}
