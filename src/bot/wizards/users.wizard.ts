import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Group } from 'src/schemas/group.schema';
import { TokenService } from 'src/token/token.service';
import { GroupService } from 'src/group/group.service';

@Wizard('users')
export class UsersWizard {

    constructor(
        private tokenService: TokenService,
        private groupService: GroupService
    ){}


  @WizardStep(1)
  async step1(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(`
Menu (responder solo con el numero):
    1. Agregar usuario
    2. Remover usuario
            `)
    await ctx.wizard.next()
  }

  @WizardStep(2)
  async switchMenu(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message){
        const group: Group = ctx.wizard.state['group']
        const option: number = parseInt(ctx.message['text'])
        const removable_users = group.users.filter(x => x.id == group.admin)
        ctx.wizard.state['users'] = removable_users
        if(option && 0 < option ){
            switch (option) {
                case 1:
                    await this.newUser(ctx)
                    await ctx.scene.leave()
                    break; 
                case 2:
                    await ctx.reply(`
Los usuarios que puedes remover son, respondeme solo con el numero:
${removable_users.map((x, index) => `${index}. ${x.name}`).join(`\n`)}
                        `)
                    await ctx.wizard.next()
                    break;

                default:
                    await ctx.reply(`La opcion elegida no es valida.`)
                    break;
            }
        }
    }
  }

  @WizardStep(3)
  async validateAction(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message){
        const group: Group = ctx.wizard.state['group']
        const option: number = parseInt(ctx.message['text']) 
        const removable_users = ctx.wizard.state['users']
        if(option && 0 < option ){
            if(option < removable_users.length){
                await ctx.reply(`Estas seguro que deseas eliminar a ${removable_users[option].toUpperCase()}?`)
                await ctx.wizard.next()
            } else {
                await ctx.reply(`La opcion elegida no es valida.`)
            }
        }
    }
  }

  @WizardStep(4)
  @Hears(/sí|si|Si/i)
  async removeUser(@Ctx() ctx: Scenes.WizardContext){

  }

  @WizardStep(4)
  @Hears(/no|No/i)
  async cancelAction(@Ctx() ctx: Scenes.WizardContext){
    ctx.scene.leave()
    ctx.scene.enter('users')
  }


  /**
   * La funcion se encarga de crear el nuevo usuario.
   */
  private newUser = async (ctx: Scenes.WizardContext) => {
    const group: Group = ctx.wizard.state['group']
    const token = await this.tokenService.generateTokenForUser(group.admin)
    await ctx.reply(`
Para este proceso el usuario a ser agregado debe iniciarlo desde su cuenta.
Una vez lo realice le va a solicitar tu ID:
    `)
    await ctx.reply(`${group.admin}`)
    await ctx.reply(`
Ademas le voy a solicitar un codigo de un solo uso, te lo voy a enviar en el siguiente mensaje.
Recorda que este codigo expira en 5 minutos.
        `)
    await ctx.reply(token)
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
