import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Spreadsheet } from 'src/schemas/sheet.schema';
import { CreateGroupDto } from 'src/group/dto/create-group.dto';
import { GroupService } from 'src/group/group.service';

@Wizard('new-group')
export class GroupWizard {

    constructor(
        private groupService: GroupService
    ){}


  @WizardStep(1)
  async start(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(
        `
Veo que no tienes un grupo asignado.
Para avanzar tenes dos opciones (solo responder con el numero):
    1. Crear grupo
    2. Sumarme a un grupo
        `
    );
    await ctx.wizard.next();
  }

  @WizardStep(2)
  @Hears('1')
  async createGroup(@Ctx() ctx: Scenes.WizardContext){
    await ctx.reply(
        `
Vamos a iniciar la creacion de un nuevo grupo.
Antes de empezar, necesitas tener una copia propia de la siguiente hoja de calculo:
    https://docs.google.com/spreadsheets/d/1Up1iqdlqJcSZ2UptAW0I9PB5u__DszHsBXs5VpyF7bc/edit?usp=sharing

¿Ya la tienes? (Si/No)
        `
    )
    await ctx.wizard.next()
  }

  @WizardStep(2)
  @Hears('2')
  async goToGroup(@Ctx() ctx: Scenes.WizardContext){
    ctx.scene.leave()
    ctx.scene.enter('member')
  }
  
  /**
   * 10 a 19: Pasos de creacion de grupo.
   * 
   */

  @WizardStep(3)
  @Hears(/no|No/i)
  async noFile(@Ctx() ctx: Scenes.WizardContext){
    await ctx.reply('Perdon, pero no podemos avanzar sin este paso. Aguardo a que realice la copia.')
  }

  @WizardStep(3)
  @Hears(/sí|si|Si/i)
  async step3(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(
        `
Perfecto. El siguiente paso es darme permisos de edicion. Este es mi email:
    hojas-de-calculo@lunar-ensign-383015.iam.gserviceaccount.com
Escribime cuando me hayas dado los permisos.
        `
    )
    await ctx.wizard.next()
  }

  @WizardStep(4)
  async step4(@Ctx() ctx: Scenes.WizardContext) {
      if(ctx.message){
        await ctx.reply(
            `
Ahora voy a necesitar me compartas el link del archivo en la hoja en la que deberia guardar las transacciones.
Deberia empezar asi: https://docs.google.com/spreadsheets/d/
            `
        );
        await ctx.wizard.next();
      }
  }

  @WizardStep(5)
  async step5(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        const url = ctx.message['text']
        const regex = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/edit\?gid=(\d+)(#gid=\d+)?$/;
        const match = url.match(regex);
        if (!match) {
            console.log(match)
            throw new Error('Invalid Google Sheet URL format');
        }
        const [, id, sheet] = match;
        ctx.wizard.state['spreadsheet'] = {id: id, balance_sheet: {id: sheet, name: ''}}
        await ctx.reply(`Bien, me confirmas el nombre de la hoja?`)
        await ctx.wizard.next()
    }
  }

  @WizardStep(6)
  async step6(@Ctx() ctx: Scenes.WizardContext) {
     if(ctx.message){
        const name = ctx.message['text']
        const sheet: Spreadsheet = ctx.wizard.state['spreadsheet']
        sheet.balance_sheet.name = name
        ctx.wizard.state['spreadsheet'] = sheet
        await ctx.reply(
            `
Listo, ahora seteemos las categorias a usar.
Podrias enviarme la lista de categorias separadas por una coma y un espacio?
            `
        )
        await ctx.wizard.next()
     }
  }

  @WizardStep(7)
  async step7(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        const message = ctx.message['text']
        const categories: string[] = message
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0);
        ctx.wizard.state['categories'] = categories
        await ctx.reply(
            `
Estas son las categorias que detecte:
${categories.join(`\n`)}
\nSon correctas? 
            `
        )
        await ctx.wizard.next()
     }
  }

  @WizardStep(8)
  @Hears(/no|No/i)
  async step8no(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply('Okay, vamos otra vez. Podrias enviarme la lista de categorias separadas por una coma y un espacio?');
    await ctx.wizard.back()
  }

  @WizardStep(8)
  @Hears(/sí|si|Si/i)
  async step8(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        await ctx.reply(
            `
Entendido, ahora voy a necesitar las diferentes cuentas que queres usar.
Al igual que lo anterior, me lo envias separado por una coma y un espacio?
            `
        )
        await ctx.wizard.next()
     }
  }

   @WizardStep(9)
  async step9(@Ctx() ctx: Scenes.WizardContext) {
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
Las pase a mayusculas para un mejor manejo de este dato.
\nSon correctas? 
            `
        )
        await ctx.wizard.next()
     }
  }

  @WizardStep(10)
  @Hears(/no|No/i)
  async step10no(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply('Okay, vamos otra vez. Podrias enviarme la lista de cuentas separadas por una coma y un espacio?');
    await ctx.wizard.back()
  }

  @WizardStep(10)
  @Hears(/sí|si|Si/i)
  async step10(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        ctx.wizard.state['holders'] = [ctx.message.from.first_name]
        await ctx.reply(
            `
Excelente, por ultimo.
En las opciones de titulres va a estar tu nombre: "${ctx.message.from.first_name}".
Queres agregar algun otro titular? (Si/No)
            `
        )
        await ctx.wizard.next()
     }
  }

  @WizardStep(11)
  @Hears(/no|No/i)
  async step11no(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(`Bien, validamos los datos entonces.`);
    await ctx.reply(this.validateGroupDataString(ctx))
    await ctx.reply(`Son correctos?`)
    await ctx.wizard.selectStep(13)
  }

  @WizardStep(11)
  @Hears(/sí|si|Si/i)
  async step11(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        await ctx.reply(
            `
Podrias enviarme los nombre de los titulares, incluido el tuyo, separados por una coma y un espacio?
            `
        )
        await ctx.wizard.next()
     }
  }  
  
  /**
   * HOLDERS
   */

  @WizardStep(12)
  async step12(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        const message = ctx.message['text']
        const holders: string[] = message
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0);
        ctx.wizard.state['holders'] = holders
        await ctx.reply(
            `
Estos son los titulares que detecte:
${holders.join(`\n`)}
\nSon correctos? 
            `
        )
        await ctx.wizard.next()
     }
  }

  @WizardStep(13)
  @Hears(/no|No/i)
  async step13no(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply('Okay, vamos otra vez. Podrias enviarme los nombres, incluyendo el tuyo, separadas por una coma y un espacio?');
    await ctx.wizard.back()
  }

  @WizardStep(13)
  @Hears(/sí|si|Si/i)
  async step13(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        await ctx.reply(`Bien. Validemos los datos entonces`)
        await ctx.reply(this.validateGroupDataString(ctx))
        await ctx.reply(`Son correctos?`)
        await ctx.wizard.next()
     }
  }

  /**
   * CLOSE STEP
   */
  @WizardStep(14)
  @Hears(/no|No/i)
  async step14No(@Ctx() ctx: Scenes.WizardContext) {
    this.cancelAll(ctx)
  }

  @WizardStep(14)
  @Hears(/sí|si|Si/i)
  async step14(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        await ctx.reply(`Perfecto, dame unos minutos que lo registro.`)
        await this.createUserGroup(ctx)
        await ctx.reply(`Listo, ya puedes empezar a registrar tus gastos.`)
        await ctx.scene.leave()
     }
  }


  /**
   * Steps to add default instalments category and transfer category
   *  
   */
  @WizardStep(15)
  @Hears(/no|No/i)
  async step15no(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(
            `
Entendido lo dejamos para mas tarde, ahora voy a necesitar las diferentes cuentas que queres usar.
Al igual que lo anterior, me lo envias separado por una coma y un espacio?
            `
        )
    await ctx.wizard.selectStep(8)
  }

  @WizardStep(15)
  @Hears(/sí|si|Si/i)
  async step15(@Ctx() ctx: Scenes.WizardContext) {
    const categories: string[] = ctx.wizard.state['categories']
    await ctx.reply(
            `
Okay, podrias decirme cual categoria deberia usar por defecto para cuotas?
${categories.map((x, index) => `${index}. ${x}`)}
            `
        )
    await ctx.wizard.next()
  }

  @WizardStep(16)
  async step16(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message){
      const message = ctx.message['text']
      const selected = parseInt(message)
      const categories: string[] = ctx.wizard.state['categories']
      if(selected && selected >= 0 && selected < categories.length){
        ctx.wizard.state['intalment_category'] = categories[selected]
        await ctx.reply(`Bien, me dirias la categoria por defecto para transferencias entre cuentas registradas?
${categories.map((x, index) => `${index}. ${x}`)}
          `)
        await ctx.wizard.next()
      }
    }
  }

  @WizardStep(17)
  async step17(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message){
      const message = ctx.message['text']
      const selected = parseInt(message)
      const categories: string[] = ctx.wizard.state['categories']
      if(selected && selected >= 0 && selected < categories.length){
        ctx.wizard.state['self_transfer_category'] = categories[selected]
        await ctx.reply(
            `
Listo, ahora sigamos con las cuentas.
Podrias enviarlas separadas por una coma y un espacio?
            `
        )
        await ctx.wizard.selectStep(8)
      }
    }
  }


  /**
   * Validate and create group
   * This functions will be used for differents steps
   */
  private validateGroupDataString = (ctx: Scenes.WizardContext): string => {
    const sheet: Spreadsheet = ctx.wizard.state['spreadsheet']
    const categories: string[] = ctx.wizard.state['categories']
    const accounts: string[] = ctx.wizard.state['accounts']
    const holders: string[] = ctx.wizard.state['holders']
    const instalment_category = ctx.wizard.state['intalment_category']
    const self_transfer_category = ctx.wizard.state['self_transfer_category'] 
    return `
El ID del archivo es: ${sheet.id}.
La hoja que voy a editar es: ${sheet.balance_sheet.name} y su ID es ${sheet.balance_sheet.id}.
Las posibles categorias serian:
\t${categories.join(`\n\t`)}
\nPor defecto usaré:
  * Cuotas: ${instalment_category}
  * Transferencia entre cuentas: ${self_transfer_category}
\nLas cuentas serian:
\t${accounts.join(`\n\t`)}
\nY, los titulares serian:
\t${holders.join(`\n\t`)}
    `
  }

  private createUserGroup = (ctx: Scenes.WizardContext) => {
    const spreadsheet: Spreadsheet = ctx.wizard.state['spreadsheet']
    const categories: string[] = ctx.wizard.state['categories']
    const accounts: string[] = ctx.wizard.state['accounts']
    const holders: string[] = ctx.wizard.state['holders']
    const instalment_category = ctx.wizard.state['intalment_category']
    const self_transfer_category = ctx.wizard.state['self_transfer_category'] 
    const user = {id: `${ctx.message?.from.id}`, name: `${ctx.message?.from.first_name}`}
    const group: CreateGroupDto = {
        admin: user.id,
        spreadsheet,
        categories,
        accounts,
        holders,
        users: [user],
        instalment_category,
        self_transfer_category
    }
    this.groupService.create(group)
  }


  @Command('cancelar')
  async cancelAll(@Ctx() ctx: Scenes.WizardContext) {
    if (ctx.scene?.current) {
        console.log(ctx.wizard.step)
        await ctx.reply('❌ Proceso cancelado.');
        await ctx.scene.leave();
    } else {
        await ctx.reply('No hay una conversación activa.');
    }
  }

}
