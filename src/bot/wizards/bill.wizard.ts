// wizards/register.wizard.ts
import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { CATEGORIES } from '../enums/categories.enum';
import { ACCOUNTS } from '../enums/accounts.enum';
import { SheetsService } from 'src/sheets/sheets.service';

@Wizard('new-bill')
export class NewBillWizard {

  private sheetsService: SheetsService = new SheetsService()

  @WizardStep(1)
  async step1(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply('🗓 ¿Cuál es la fecha del gasto? (dd/mm/yyyy)');
    ctx.wizard.next();
  }

  @WizardStep(2)
  async step2(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message && this.isValidDate(ctx.message['text'])){
        ctx.wizard.state['date'] = ctx.message['text'];
        await ctx.reply(`Fecha: ${ctx.wizard.state['date']} \n¿A cual de estas categoria corresponde? 
            ${CATEGORIES.map((x) => {return `\n\t${x}`}).toLocaleString()}`
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
        const message = ctx.message
        if(CATEGORIES.find((x) => x == message['text'])){
            ctx.wizard.state['category'] = message['text'];
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
        const message = ctx.message
        if(ACCOUNTS.find((x) => x == message['text'])){
            ctx.wizard.state['account'] = message['text'];
            await ctx.reply(`Cuenta ${ctx.wizard.state['account']} \n¿Quien es el titular de esa cuenta?`);
            ctx.wizard.next();
        } else {
            await ctx.reply(`Lo siento la cuenta ingresada no es valida. \Selecciona una de la lista: ${ACCOUNTS.map((x) => {return `\n\t${x}`}).toLocaleString()}`);
            return
        }
    }
  }

  @WizardStep(6)
  async step6(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const message = ctx.message
        if(message['text'] == 'Belu' || message['text'] == 'Agus'){
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
        const debit = parseInt(ctx.message['text']);
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
        const credit = parseInt(ctx.message['text']);
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
    this.sheetsService.addRow().finally(() => this.sheetsService.pushData(sheetArray))
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


  private isValidDate(value: string): boolean {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return false;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (month < 1 || month > 12) return false;

    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
  }

}
