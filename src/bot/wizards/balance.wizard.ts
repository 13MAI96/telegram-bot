import { Wizard, WizardStep, Ctx, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Group } from 'src/schemas/group.schema';
import { SheetsService } from 'src/sheets/sheets.service';
import { Observation } from 'src/sheets/observation.model';

@Wizard('balance')
export class BalanceWizard {
    constructor(
        private sheetService: SheetsService
    ){}


  @WizardStep(1)
  async start(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(
        `
Deseas ver el balance de alguna cuenta/titular especifica?
    1. Ver balance por titular
    2. Ver balance por cuenta
    3. Ver todos los balances
        `
    );
    await ctx.wizard.next();
  }

  @WizardStep(2)
  async validateId(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message && ctx.message['text']){
      const action = parseInt(ctx.message['text'])
      const group: Group = ctx.wizard.state['group']
      if(action){
        switch (action) {
            case 1:
                await ctx.reply(`
El balance de cual de los titulares queres ver?
${group.holders.map((x, index) => `${index}. ${x}`).join('\n')}
                    `)
                await ctx.wizard.next()
                break;
            case 2:
                await ctx.reply(`
Elegi una de las cuentas para obtener sus balances:
${group.accounts.map((x, index) => `${index}. ${x}`).join(`\n`)}
                    `)
                await ctx.wizard.selectStep(4)
                break;
            case 3:
                const balance: Observation = await this.sheetService.getObservableData(group)
                await ctx.reply(`
${balance}
                    `)
                ctx.scene.leave()
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
        const message = parseInt(ctx.message['text'])
        const group: Group = ctx.wizard.state['group']
        if(message && message > 0 && message < group.holders.length){
            const balance = await this.sheetService.getObservableData(group)
            const res = balance.holders.filter(x => x.name == group.holders[message])
                await ctx.reply(
                    `
${res}
                    `
                )
                await ctx.scene.leave()
        }
    }
  }


  /**
   * Steps to get balance by account.
   * 
   */
  @WizardStep(4)
  async getByAccountProcess(@Ctx() ctx: Scenes.WizardContext){
    await ctx.wizard.next()
  }

  @WizardStep(5)
  async getByAccount(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message){
        const message = parseInt(ctx.message['text'])
        const group: Group = ctx.wizard.state['group']
        if(message && message > 0 && message < group.accounts.length){
            const balance = await this.sheetService.getObservableData(group)
            const res = balance.holders.map(x => {
                x.accounts = x.accounts.filter(y => y.name == group.accounts[message])
                return x
            })
            await ctx.reply(
                    `
${res}
                    `
            )
            await ctx.scene.leave()
        } else {
            ctx.reply(`El numero enviado no es valido.`)
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
