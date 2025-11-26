import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SheetsService } from 'src/sheets/sheets.service';
import { Group } from 'src/schemas/group.schema';
import { DateService } from 'src/shared/services/date.service';

@Wizard('bill')
export class BillWizard {
  constructor(
    private sheetsService: SheetsService,
    private dateService: DateService
  ){}


  @WizardStep(1)
  async step1(@Ctx() ctx: Scenes.WizardContext) {
    this.sheetsService.getObservableData(ctx.wizard.state['group'])
    await ctx.reply('🗓 ¿Cuál es la fecha del gasto? (dd/mm/yyyy)');
    ctx.wizard.next();
  }

  @WizardStep(2)
  @Hears(/hoy/i)
  async today(@Ctx() ctx: Scenes.WizardContext) {
    const group: Group = ctx.wizard.state['group']
    const date = new Date()
    ctx.wizard.state['date'] = this.dateService.formatDateToDDMMYYYY(date);
    await ctx.reply(`Fecha: ${ctx.wizard.state['date']} \n¿A cual de estas categoria corresponde? (Mandame solo el numero.)
  ${group.categories.map((x, index) => {return `${index}. ${x}`}).join(`\n\t`)}`
        );
    ctx.wizard.next();
  }

  @WizardStep(2)
  async step2(@Ctx() ctx: Scenes.WizardContext) {
    const group: Group = ctx.wizard.state['group']
    if(ctx.message && this.dateService.isValidDate(ctx.message['text'])){
        ctx.wizard.state['date'] = ctx.message['text'];
        await ctx.reply(`Fecha: ${ctx.wizard.state['date']} \n¿A cual de estas categoria corresponde? (Mandame solo el numero.)
  ${group.categories.map((x, index) => {return `${index}. ${x}`}).join(`\n\t`)}`
        );
        ctx.wizard.next();
    } else {
        await ctx.reply(`Fecha o formato invalidos. \nIngresala nuevamente:`);
        return
    }
  }

  @WizardStep(3)
  async step3(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const group: Group = ctx.wizard.state['group']
        const message = ctx.message['text']
        const selected = parseInt(message)
        if( isNaN(selected) && selected > -1 && selected < group.categories.length){
          ctx.wizard.state['category'] = group.categories[message];
            await ctx.reply(`Categoria ${ctx.wizard.state['category']} \n¿Me describis de que es este gasto?`);
            ctx.wizard.next();
        } else {
            await ctx.reply(`Lo siento la categoria ingresada no es valida. \nIngresala nuevamente:`);
            return
        }
    }
  }

  @WizardStep(4)
  async step4(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        ctx.wizard.state['description'] = ctx.message['text'];
            await ctx.reply(`Descripcion ${ctx.wizard.state['description']} \n¿Desde que cuenta realizaste la transaccion?`);
            ctx.wizard.next();
      }
  }

  @WizardStep(5)
  async step5(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const group: Group = ctx.wizard.state['group']
        const message = ctx.message['text'].toUpperCase()
        if(group.accounts.find((x) => x == message)){
            ctx.wizard.state['account'] = message;
            await ctx.reply(`Cuenta ${ctx.wizard.state['account']} \n¿Quien es el titular de esa cuenta?`);
            ctx.wizard.next();
        } else {
            await ctx.reply(`Lo siento la cuenta ingresada no es valida. \Selecciona una de la lista: ${group.accounts.map((x) => {return `\n\t${x}`}).toLocaleString()}`);
            return
        }
    }
  }

  @WizardStep(6)
  async step6(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const group: Group = ctx.wizard.state['group']
        const message = ctx.message
        if(group.holders.find((x) => x == message['text'])){
            ctx.wizard.state['owner'] = message['text'];
            await ctx.reply(`Titular: ${ctx.wizard.state['owner']} \n¿Cuanto deberia debitar de la cuenta?`);
            ctx.wizard.next();
        } else {
            await ctx.reply(`Lo siento la el titular no es valido.`);
            return
        }
    }
  }

  @WizardStep(7)
  async step7(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        const debit = parseFloat(ctx.message['text']);
        if (isNaN(debit) || debit < 0) {
          await ctx.reply('🚫 Monto invalido. Ingresá un número válido.');
          return;
        }
        ctx.wizard.state['debit'] = debit;
        await ctx.reply(`Cuanto deberia acreditar en la cuenta?`);
        ctx.wizard.next();
    }
  }

  @WizardStep(8)
  async step8(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        const credit = parseFloat(ctx.message['text']);
        if (isNaN(credit) || credit < 0) {
          await ctx.reply('🚫 Monto invalido. Ingresá un número válido.');
          return;
        }
        ctx.wizard.state['credit'] = credit;
        ctx.wizard.state['created_by'] = ctx.message.from.first_name
        await ctx.reply(
          `✅ Confirmo tus datos:
                Fecha: ${ctx.wizard.state['date']}
                Categoria: ${ctx.wizard.state['category']}
                Descripcion: ${ctx.wizard.state['description']}
                Cuenta: ${ctx.wizard.state['account']}
                Titular: ${ctx.wizard.state['owner']}
                Debito: ${ctx.wizard.state['debit']}
                Credito: ${ctx.wizard.state['credit']}
                Creado por: ${ctx.wizard.state['created_by']}
                
            ¿Deseás confirmar? (sí/no)`
        );
        ctx.wizard.next();

    }
  }

  @WizardStep(9)
  @Hears(/sí|si|Si/i)
  async confirm(@Ctx() ctx: Scenes.WizardContext) {
    const group = ctx.wizard.state['group']
    const sheetArray = [
        ctx.wizard.state['date'],
        ctx.wizard.state['category'],
        ctx.wizard.state['description'],
        ctx.wizard.state['account'],
        ctx.wizard.state['owner'],
        ctx.wizard.state['debit'],
        ctx.wizard.state['credit'],
        ctx.wizard.state['created_by']
    ]
    this.sheetsService.addRow(group).finally(() => this.sheetsService.pushData(sheetArray, group))
    await ctx.reply('🎉 ¡Registro completado!');
    return ctx.scene.leave(); 
  }

  @WizardStep(9)
  @Hears(/no|No/i)
  async cancel(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply('❌ Registro cancelado. Podés reiniciar con /registrar.');
    return ctx.scene.leave();
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
