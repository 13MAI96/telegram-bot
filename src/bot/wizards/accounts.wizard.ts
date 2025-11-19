import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { GroupService } from 'src/group/group.service';
import { Group } from 'src/schemas/group.schema';

@Wizard('accounts')
export class AccountsWizard {
    constructor(
        private groupService: GroupService,
    ){}


  @WizardStep(1)
  async start(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(
        `
Que accion deseas realizar:
    1. Agregar cuentas
    2. Remover cuentas
        `
    );
    await ctx.wizard.next();
  }

  @WizardStep(2)
  async validateId(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message && ctx.message['text']){
      const action = parseInt(ctx.message['text'])
      if(action){
        switch (action) {
            case 1:
              await ctx.reply(`Que cuentas deseas agregar? Envialas separadas por coma.`)
              await ctx.wizard.next()
              break;
            case 2:
              const accounts: string[] = ctx.wizard.state['group'].accounts
              await ctx.reply(`
Estas son las cuentas actuales:
${accounts.map((x, index) => `${index}. ${x}`).join(`\n`)}
\nCual de ellas deseas eliminar?
                  `)
              await ctx.wizard.selectStep(5)
              break;
            default:
              await ctx.reply(`La opcion elegida no es valida.`)
              break;
        }
      }
    } 
  }

  @WizardStep(3)
  async step3(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
      const message = ctx.message['text']
      const accounts: string[] = message
          .split(',')
          .map(v => v.trim().toUpperCase())
          .filter(v => v.length > 0);
      ctx.wizard.state['accounts'] = accounts
      await ctx.reply(
              `
Estas son las cuentas que detecte:
${accounts.join(`\n`)}
\nSon correctas? 
              `
        )
      await ctx.wizard.next()
    }
  }

  @WizardStep(4)
  @Hears(/sí|si|Si/i)
  async addAccount(@Ctx() ctx: Scenes.WizardContext){
    const group: Group = ctx.wizard.state['group']
    const accounts: string[] = ctx.wizard.state['accounts']
    group.accounts.push(...accounts)
    await this.groupService.update(group._id, group)
    await ctx.reply(`Listo, las cuentas ya fueron agregadas.`)
    await ctx.scene.leave()
    await ctx.scene.enter('accounts', {group: group})
  }

  @WizardStep(4)
  @Hears(/no|No/i)
  async step4(@Ctx() ctx: Scenes.WizardContext){
    await ctx.reply('Okay, vamos otra vez. Enviame las cuentas separadas por coma:')
    await ctx.wizard.selectStep(2)
  }


  /**
   * Steps to remove an account start here.
   * 
   */
  @WizardStep(5)
  async removeAccountProcess(@Ctx() ctx: Scenes.WizardContext){
    await ctx.wizard.next()
  }

  @WizardStep(6)
  async removeAccount(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message){
      const message = ctx.message['text']
      const selected = parseInt(message)
          if(selected){
              const group: Group = ctx.wizard.state['group']
              group.accounts = group.accounts.filter((x, index) => index != selected )
              await this.groupService.update(group._id, group)
              ctx.wizard.state['group'] = group
              await ctx.reply(`La cuenta ya fue eliminada.`)
              await ctx.scene.leave()
              await ctx.scene.enter('accounts', {group: group})
          }
    }
  }


  /**
   * Cancell All
   * This funcion is listening for a /cancelar command.
   * Its function is to close any actual wizard on execution.
   */
  @Command('cancelar')
  async cancelAll(@Ctx() ctx: Scenes.WizardContext) {
    if (ctx.scene?.current) {
        await ctx.reply('❌ Proceso cancelado.');
        await ctx.scene.leave();
    } else {
        await ctx.reply('No hay una conversación activa.');
    }
  }

}
