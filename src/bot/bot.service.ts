import { Update, Start, Help, Hears, Ctx, Command } from 'nestjs-telegraf';
import { GroupService } from 'src/group/group.service';
import { Context, Scenes } from 'telegraf';


@Update()
export class BotUpdate {

  constructor(
    private groupService: GroupService,
  ){
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
        await ctx.scene.enter('tranfer', {group: group})
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

}
