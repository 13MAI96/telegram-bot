import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SheetsService } from 'src/sheets/sheets.service';
import { Group } from 'src/schemas/group.schema';
import { DateService } from 'src/shared/services/date.service';

@Wizard('transfer')
export class TransferWizard {
  constructor(
    private sheetsService: SheetsService,
    private dateService: DateService
  ){}


  @WizardStep(1)
  async step1(@Ctx() ctx: Scenes.WizardContext) {
    const group: Group = ctx.wizard.state['group']
    if(!group.self_transfer_category){
        await ctx.reply('Primero deber configurar categoria para transferencias entre cuentas propias.')
        return ctx.scene.leave()
    }
    this.sheetsService.getObservableData(ctx.wizard.state['group'])
    await ctx.reply('🗓 ¿Cuál es la fecha de la transferencia? (dd/mm/yyyy)');
    ctx.wizard.next();
  }

  @WizardStep(2)
  @Hears(/hoy/i)
  async today(@Ctx() ctx: Scenes.WizardContext) {
    const group: Group = ctx.wizard.state['group']
    const date = new Date()
    ctx.wizard.state['date'] = this.dateService.formatDateToDDMMYYYY(date);
    await ctx.reply(`Fecha: ${ctx.wizard.state['date']} \n¿Desde que cuenta moviste el dinero?
            `
        );
    ctx.wizard.next();
  }

  @WizardStep(2)
  async step2(@Ctx() ctx: Scenes.WizardContext) {
    const group: Group = ctx.wizard.state['group']
    if(ctx.message && this.dateService.isValidDate(ctx.message['text'])){
        ctx.wizard.state['date'] = ctx.message['text'];
        await ctx.reply(`Fecha: ${ctx.wizard.state['date']} \n¿Desde que cuenta moviste el dinero?
            `
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
        const message = ctx.message['text'].toUpperCase()
        if(group.accounts.find((x) => x == message)){
            ctx.wizard.state['origin_account'] = message;
            await ctx.reply(`Cuenta ${ctx.wizard.state['origin_account']} \n¿Quien es el titular de esa cuenta?`);
            ctx.wizard.next();
        } else {
            await ctx.reply(`Lo siento la cuenta ingresada no es valida. \Selecciona una de la lista: ${group.accounts.map((x) => {return `\n\t${x}`}).toLocaleString()}`);
            return
        }
    }
  }

  @WizardStep(4)
  async step4(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const group: Group = ctx.wizard.state['group']
        const message = ctx.message
        if(group.holders.find((x) => x == message['text'])){
            ctx.wizard.state['origin_owner'] = message['text'];
            await ctx.reply(`Titular: ${ctx.wizard.state['origin_owner']} \n¿A que cuenta moviste la plata?`);
            ctx.wizard.next();
        } else {
            await ctx.reply(`Lo siento la el titular no es valido.`);
            return
        }
    }
  }

  @WizardStep(5)
  async step5(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        const group: Group = ctx.wizard.state['group']
        const message = ctx.message['text'].toUpperCase()
        if(group.accounts.find((x) => x == message)){
            ctx.wizard.state['final_account'] = message;
            await ctx.reply(`Cuenta ${ctx.wizard.state['final_account']} \n¿Quien es el titular de esa cuenta?`);
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
            ctx.wizard.state['final_owner'] = message['text'];
            await ctx.reply(`Titular: ${ctx.wizard.state['final_owner']} \n¿De cuanto fue la transferencia?`);
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
        const group: Group = ctx.wizard.state['group']
        ctx.wizard.state['debit'] = debit;
        ctx.wizard.state['created_by'] = ctx.message.from.first_name
        await ctx.reply(
          `✅ Confirmo tus datos:
                Fecha: ${ctx.wizard.state['date']}
                Categoria: ${group.self_transfer_category}
                Descripcion: ${ctx.wizard.state['origin_account']} to ${ctx.wizard.state['final_account']}
                Cuenta: ${ctx.wizard.state['origin_account']}
                Titular: ${ctx.wizard.state['origin_owner']}
                Debito: ${ctx.wizard.state['debit']}
                Credito: 0
                Creado por: ${ctx.wizard.state['created_by']}

            Destino:
                Fecha: ${ctx.wizard.state['date']}
                Categoria: ${group.self_transfer_category}
                Descripcion: ${ctx.wizard.state['origin_account']} to ${ctx.wizard.state['final_account']}
                Cuenta: ${ctx.wizard.state['final_account']}
                Titular: ${ctx.wizard.state['final_owner']}
                Debito: 0
                Credito: ${ctx.wizard.state['debit']}
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
    const debitArray = [
        ctx.wizard.state['date'],
        group.self_transfer_category,
        `${ctx.wizard.state['origin_account']} to ${ctx.wizard.state['final_account']}`,
        ctx.wizard.state['origin_account'],
        ctx.wizard.state['origin_owner'],
        ctx.wizard.state['debit'],
        0,
        ctx.wizard.state['created_by']
    ]
    await this.sheetsService.addRow(group).finally(() => this.sheetsService.pushData(debitArray, group))
    const creditArray = [
        ctx.wizard.state['date'],
        group.self_transfer_category,
        `${ctx.wizard.state['origin_account']} to ${ctx.wizard.state['final_account']}`,
        ctx.wizard.state['final_account'],
        ctx.wizard.state['final_owner'],
        0,
        ctx.wizard.state['debit'],
        ctx.wizard.state['created_by']
    ]
    this.sheetsService.addRow(group).finally(() => this.sheetsService.pushData(creditArray, group))
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
