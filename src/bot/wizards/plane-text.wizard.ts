import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SheetsService } from 'src/sheets/sheets.service';
import { Group } from 'src/schemas/group.schema';
import { DateService } from 'src/shared/services/date.service';
import { NumberService } from 'src/shared/services/number.service';

@Wizard('plane-text')
export class PlaneTextWizard {
  constructor(
    private sheetsService: SheetsService,
    private dateService: DateService,
    private numberService: NumberService
  ){}


  @WizardStep(1)
  async step1(@Ctx() ctx: Scenes.WizardContext) {
    const message = ctx.wizard.state['text']
    const group: Group = ctx.wizard.state['group']
    const bill: string[] = message
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);
    if(bill.length < 4){
      ctx.reply('Comando invalido.')
      return ctx.scene.leave()
    }
    const category = group.categories.find(x => x.toLowerCase() == bill[1].toLowerCase())
    const account = group.accounts.find(x => x.toLowerCase() == bill[3].toLowerCase())
    const holder = group.holders.find(x => x.toLowerCase() == bill[4].toLowerCase())
    if(!category || !account || !holder){
        await ctx.reply('🚫 Datos invalidos. Recorda enviarme: descripcion, categoria, monto, cuenta y titular separados por una coma.');
        return;
    }
    const debit = this.numberService.toNumber(bill[2]);
    if (debit <= 0) {
        await ctx.reply('🚫 Monto invalido. Recorda enviarme: descripcion, categoria, monto, cuenta y titular separados por una coma.');
        return;
    }
    ctx.wizard.state['date'] = this.dateService.formatDateToDDMMYYYY(new Date());
    ctx.wizard.state['description'] = bill[0]
    ctx.wizard.state['category'] = category
    ctx.wizard.state['debit'] = debit
    ctx.wizard.state['account'] = account
    ctx.wizard.state['holder'] = holder
    ctx.wizard.state['created_by'] = ctx.message?.from.first_name

    await ctx.reply(
                `
Este es el gasto que detecte:
            Fecha: ${ctx.wizard.state['date']}
            Categoria: ${ctx.wizard.state['category']}
            Descripcion: ${ctx.wizard.state['description']}
            Cuenta: ${ctx.wizard.state['account']}
            Titular: ${ctx.wizard.state['holder']}
            Debito: ${ctx.wizard.state['debit']}
            Credito: 0
            Creado por: ${ctx.wizard.state['created_by']}
                
¿Deseás confirmar? (sí/no) 
                `
            )
    await ctx.wizard.next()
  }

  @WizardStep(2)
  @Hears(/no|No/i)
  async reject(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply('❌ Bueno elimino estos datos. Empezamos otra vez? Recorda enviarme: descripcion, categoria, monto, cuenta y titular separados por una coma.');
    return ctx.wizard.next();
  }

  @WizardStep(2)
  @Hears(/sí|si|Si/i)
  async step2(@Ctx() ctx: Scenes.WizardContext) {
    const group = ctx.wizard.state['group']
    const sheetArray = [
        ctx.wizard.state['date'],
        ctx.wizard.state['category'],
        ctx.wizard.state['description'],
        ctx.wizard.state['account'],
        ctx.wizard.state['holder'],
        ctx.wizard.state['debit'],
        this.numberService.toNumber(ctx.wizard.state['credit']),
        ctx.wizard.state['created_by']
    ]
    this.sheetsService.addRow(group).finally(() => this.sheetsService.pushData(sheetArray, group))
    await ctx.reply('🎉 ¡Registro completado!');
    return ctx.scene.leave(); 
  }

  @WizardStep(3)
  async step3(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const group: Group = ctx.wizard.state['group']
        const message = ctx.message['text']
        ctx.scene.leave();
        ctx.scene.enter('plane-text',{group: group, text: message})
    }
  }


    @Command('cancelar')
    async cancelAll(@Ctx() ctx: Scenes.SceneContext) {
      if (ctx.scene?.current) {
          await ctx.reply('❌ Escena cancelada.');
          await ctx.scene.leave();
      } else {
          await ctx.reply('No hay una conversación activa.');
      }
    }

}
