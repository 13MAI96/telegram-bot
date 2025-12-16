import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SheetsService } from 'src/sheets/sheets.service';
import { Group } from 'src/schemas/group.schema';
import { DateService } from 'src/shared/services/date.service';
import { NumberService } from 'src/shared/services/number.service';

@Wizard('instalment')
export class InstallmentWizard {

  constructor(
    private sheetsService: SheetsService,
    private dateService: DateService,
    private numberService: NumberService
  ){}


  @WizardStep(1)
  async step1(@Ctx() ctx: Scenes.WizardContext) {
    const group: Group = ctx.wizard.state['group']
    if(group.instalment_categories.length > 0){
      await ctx.reply('🗓 Asi que pasando a rojo eh \n¿Cuando se pagaria la primer cuota? (dd/mm/yyyy)');
      ctx.wizard.next();
    } else {
      await ctx.reply(`Primero debes configurar una categoria default para cuotas.`)
      await ctx.scene.leave()
    }
  }

  @WizardStep(2)
  @Hears(/hoy/i)
  async today(@Ctx() ctx: Scenes.WizardContext) {
    const date = new Date()
    ctx.wizard.state['date'] = this.dateService.formatDateToDDMMYYYY(date);
    await this.step2Default(ctx)
  }

  @WizardStep(2)
  async step2(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message && this.dateService.isValidDate(ctx.message['text'])){
        ctx.wizard.state['date'] = ctx.message['text'];
        await this.step2Default(ctx)
    } else {
        await ctx.reply(`Fecha o formato invalidos. \nIngresala nuevamente:`);
        return
    }
  }

  async step2Default(@Ctx() ctx: Scenes.WizardContext){
    const group = ctx.wizard.state['group']
    await ctx.reply(`Fecha: ${ctx.wizard.state['date']} \n¿A cual de estas categoria corresponde? (Mandame solo el numero.)
${group.instalment_categories.map((x, index) => {return `${index}. ${x}`}).join(`\n\t`)}`
    );
    ctx.wizard.next();
  }

  @WizardStep(3)
  async categoryStep(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message){
      const group: Group = ctx.wizard.state['group']
      const message = ctx.message['text']
      const selected = parseInt(message)
      if( !isNaN(selected) && selected > -1 && selected < group.instalment_categories.length){
        ctx.wizard.state['category'] = group.instalment_categories[message];
        await ctx.reply(`Categoria ${ctx.wizard.state['category']} \n¿Me describis de que es este gasto?`);
        ctx.wizard.next();
      } else {
          await ctx.reply(`Lo siento la categoria ingresada no es valida. \nIngresala nuevamente:`);
          return
      }
    }
  }


  @WizardStep(4)
  async step3(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        ctx.wizard.state['description'] = ctx.message['text'];
            await ctx.reply(`Descripcion: ${ctx.wizard.state['description']} \n¿Desde que cuenta vas a abonar las cuotas?`);
            ctx.wizard.next();
      }
  }

  @WizardStep(5)
  async step4(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
      const accounts: string[] = ctx.wizard.state['group'].accounts
      const message = ctx.message
      if(accounts.find((x) => x == message['text'].toUpperCase())){
          ctx.wizard.state['account'] = message['text'].toUpperCase();
          await ctx.reply(`Cuenta: ${ctx.wizard.state['account']} \n¿Quien es el titular de esa cuenta?`);
          ctx.wizard.next();
      } else {
          await ctx.reply(`Lo siento la cuenta ingresada no es valida. \Selecciona una de la lista: ${accounts.join('\n\t')}`);
          return
      }
    }
  }

  @WizardStep(6)
  async step5(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const holders: string[] = ctx.wizard.state['group'].holders
        const message = ctx.message
        if( holders.find( x => x == message['text'])){
            ctx.wizard.state['owner'] = message['text'];
            await ctx.reply(`Titular: ${ctx.wizard.state['owner']} \n¿De cuantas cuotas estariamos hablando?`);
            ctx.wizard.next();
        } else {
            await ctx.reply(`Lo siento la el titular no es valido.`);
            return
        }
    }
  }

  @WizardStep(7)
  async step6(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
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


  @WizardStep(8)
  async step7(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        const debit = this.numberService.toNumber(ctx.message['text']);
        const instalments = ctx.wizard.state['instalments']
        if (debit < 0) {
          await ctx.reply('🚫 Monto invalido. Ingresá un número válido.');
          return;
        }
        ctx.wizard.state['debit'] = Math.round((debit/instalments)*100)/100;
        ctx.wizard.state['created_by'] = ctx.message.from.first_name

        
        const instalmentsDates: string[] = []
        for(let i = 0; i < instalments; i++){
            const newDate = this.dateService.addMonthsExactDDMMYYYY(ctx.wizard.state['date'], i)
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
    const group: Group = ctx.wizard.state['group']
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
        await this.sheetsService.addRow(group).then(() => this.sheetsService.pushData(sheetArray, group)).finally(async () => {
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

}
