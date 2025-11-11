import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { ACCOUNTS } from '../enums/accounts.enum';
import { SheetsService } from 'src/sheets/sheets.service';

@Wizard('new-instalment')
export class NewInstallmentWizard {

  private sheetsService: SheetsService = new SheetsService()

  @WizardStep(1)
  async step1(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply('🗓 Asi que pasando a rojo eh \n¿Cuando se pagaria la primer cuota? (dd/mm/yyyy)');
    ctx.wizard.next();
  }

  @WizardStep(2)
  async step2(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message && this.isValidDate(ctx.message['text'])){
        ctx.wizard.state['date'] = ctx.message['text'];
        ctx.wizard.state['category'] = 'Tarjetas de Credito'
        await ctx.reply(`Fecha: ${ctx.wizard.state['date']} 
            \nPara este tipo de transaccion la categoria esta definida por defecto.
            \nCategoria: Tarjetas de Credito  
            \n¿Me contas de que es el gasto?`
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
        ctx.wizard.state['description'] = ctx.message['text'];
            await ctx.reply(`Descripcion: ${ctx.wizard.state['description']} \n¿Desde que cuenta vas a abonar las cuotas?`);
            ctx.wizard.next();
      }
  }

  @WizardStep(4)
  async step4(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const message = ctx.message
        if(ACCOUNTS.find((x) => x == message['text'].toUpperCase())){
            ctx.wizard.state['account'] = message['text'].toUpperCase();
            await ctx.reply(`Cuenta: ${ctx.wizard.state['account']} \n¿Quien es el titular de esa cuenta?`);
            ctx.wizard.next();
        } else {
            await ctx.reply(`Lo siento la cuenta ingresada no es valida. \Selecciona una de la lista: ${ACCOUNTS.map((x) => {return `\n\t${x}`}).toLocaleString()}`);
            return
        }
    }
  }

  @WizardStep(5)
  async step5(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const message = ctx.message
        if(message['text'] == 'Belu' || message['text'] == 'Agus'){
            ctx.wizard.state['owner'] = message['text'];
            await ctx.reply(`Titular: ${ctx.wizard.state['owner']} \n¿De cuantas cuotas estariamos hablando?`);
            ctx.wizard.next();
        } else {
            await ctx.reply(`Lo siento la el titular no es valido.`);
            return
        }
    }
  }

  @WizardStep(6)
  async step6(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const message = ctx.message
        const instalments = parseInt(ctx.message['text']);
        if (isNaN(instalments) || instalments < 1) {
          await ctx.reply('🚫 Cantidad de cuotas invalida. Ingresá un número válido.');
          return;
        }
       ctx.wizard.state['instalments'] = instalments
       await ctx.reply('💸 ¿Cuanto gastaste?')
       ctx.wizard.next()
    }
  }


  @WizardStep(7)
  async step7(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        const debit = parseInt(ctx.message['text']);
        const instalments = ctx.wizard.state['instalments']
        if (isNaN(debit) || debit < 0) {
          await ctx.reply('🚫 Monto invalido. Ingresá un número válido.');
          return;
        }
        ctx.wizard.state['debit'] = Math.round((debit/instalments)*100)/100;
        ctx.wizard.state['created_by'] = ctx.message.from.first_name

        
        const instalmentsDates: string[] = []
        for(let i = 0; i < instalments; i++){
            const newDate = this.addMonthsExactDDMMYYYY(ctx.wizard.state['date'], i)
            if(newDate) instalmentsDates.push(newDate)
        }
        ctx.wizard.state['instalment_dates'] = instalmentsDates

        await ctx.reply(
          `Ok, confirmemos datos entonces.
            ✅ Este es el gasto:
                Categoria: ${ctx.wizard.state['category']}
                Descripcion: ${ctx.wizard.state['description']}
                Cuenta: ${ctx.wizard.state['account']}
                Titular: ${ctx.wizard.state['owner']}
                Debito: ${ctx.wizard.state['debit']}
                Credito: 0
                Creado por: ${ctx.wizard.state['created_by']}

            🗓 Y estas serian las fechas de las cuotas:
                ${instalmentsDates.map(x => `\n\t\t${x}`).toLocaleString()}
                
            ¿Deseás confirmar? (sí/no)`
        );
        ctx.wizard.next();

    }
  }

  @WizardStep(9)
  @Hears(/sí|si|Si/i)
  async confirm(@Ctx() ctx: Scenes.WizardContext) {
    const instalmentsDates = ctx.wizard.state['instalment_dates']
    await ctx.reply('Okay,dame unos segundos mientras guardo la info.')
    for(let i = 0; i < instalmentsDates.length; i++){
        const sheetArray = [
            instalmentsDates[i],
            ctx.wizard.state['category'],
            `${ctx.wizard.state['description']} - Cuota ${i+1} de ${ctx.wizard.state['instalments']}`,
            ctx.wizard.state['account'],
            ctx.wizard.state['owner'],
            ctx.wizard.state['debit'],
            0,
            ctx.wizard.state['created_by']
        ]
        await this.sheetsService.addRow().then(() => this.sheetsService.pushData(sheetArray)).finally(async () => {
            await ctx.reply(`Ya registre la cuota nº${i+1}`)
        })
    }
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

  private parseDateFromDDMMYYYY(value: string): Date | null {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JS usa 0-based months
    const year = parseInt(match[3], 10);

    const date = new Date(year, month, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
  }

  private formatDateToDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private addMonthsExactDDMMYYYY(value: string, months: number): string | null {
    const date = this.parseDateFromDDMMYYYY(value);
    if (!date) return null;

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const target = new Date(year, month + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();

    target.setDate(Math.min(day, lastDay));

    return this.formatDateToDDMMYYYY(target);
  }



}
