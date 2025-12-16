import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Update, Start, Help, Hears, Ctx, Command, On, InjectBot } from 'nestjs-telegraf';
import { GroupService } from 'src/group/group.service';
import { Context, Scenes, Telegraf } from 'telegraf';


@Update()
export class BotUpdate implements OnModuleInit, OnModuleDestroy {

  constructor(
    private groupService: GroupService,
    @InjectBot() private readonly bot: Telegraf
  ){

  }


  async onModuleInit() {
    await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
    this.startWithRetry()
  }

  async onModuleDestroy() {
    await this.bot.stop();
  }

  private async startWithRetry(delay = 30000) {
    try {
      await this.bot.launch().then(x => console.log(x));
    } catch (err) {
      if (err.code === 409) {
        console.warn(`Retrying bot start in ${delay / 1000}s`);
        setTimeout(() => this.startWithRetry(delay), delay);
        return;
      }
      throw err;
    }
  }



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
    if(ctx.message){
      await ctx.reply(`¡Hola ${ctx.message.from.first_name ?? ''}! 😄`);
      await ctx.reply(`Selecciona un comando para iniciar, o /config si no tienes grupo asignado`);
    }
  }

  @Command('config')
  async startConfig(@Ctx() ctx: Scenes.SceneContext){
    if(ctx.message?.from.id){
      const group = await this.groupService.hasAssignedGroup(`${ctx.message?.from.id}`)
      if(group){ 
        await ctx.scene.enter('config', {group: group})
      } else {
        await ctx.scene.enter('new-group')
      }
    }
  }

  @Command('gasto')
  async startBill(@Ctx() ctx: Scenes.SceneContext) {
    if(ctx.message?.from.id){
      const group = await this.groupService.hasAssignedGroup(`${ctx.message?.from.id}`)
      if(group){ 
        await ctx.scene.enter('bill', {group: group})
      } else {
        await ctx.scene.enter('new-group')
      }
    }
  }

  @Command('cuotas')
  async startInstalment(@Ctx() ctx: Scenes.SceneContext) {
    if(ctx.message?.from.id){
      const group = await this.groupService.hasAssignedGroup(`${ctx.message?.from.id}`)
      if(group){ 
        await ctx.scene.enter('instalment', {group: group})
      } else {
        await ctx.scene.enter('new-group')
      }
    }
  }

  @Command('fijo')
  async fixedCost(@Ctx() ctx: Scenes.SceneContext) {
    if(ctx.message?.from.id){
      const group = await this.groupService.hasAssignedGroup(`${ctx.message?.from.id}`)
      if(group){ 
        await ctx.scene.enter('fixed-cost', {group: group})
      } else {
        await ctx.scene.enter('new-group')
      }
    }
  }

  @Command('transferencia')
  async transfer(@Ctx() ctx: Scenes.SceneContext) {
    if(ctx.message?.from.id){
      const group = await this.groupService.hasAssignedGroup(`${ctx.message?.from.id}`)
      if(group){ 
        await ctx.scene.enter('transfer', {group: group})
      } else {
        await ctx.scene.enter('new-group')
      }
    }
  }

  @Command('saldos')
  @Command('balance')
  async balance(@Ctx() ctx: Scenes.SceneContext) {
    if(ctx.message?.from.id){
      const group = await this.groupService.hasAssignedGroup(`${ctx.message?.from.id}`)
      if(group){ 
        await ctx.scene.enter('balance', {group: group})
      } else {
        await ctx.scene.enter('new-group')
      }
    }
  }

  @On('text')
  async planeTextManager(@Ctx() ctx: Scenes.SceneContext){
    if(ctx.message?.from.id ){
      const group = await this.groupService.hasAssignedGroup(`${ctx.message.from.id}`)
      if(group){
        await ctx.scene.enter('plane-text', {group: group, text: ctx.message['text']})
      } else {
        await ctx.scene.enter('new-group')
      }
    }
  }

}
