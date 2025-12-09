import { Wizard, WizardStep, Ctx, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Group } from 'src/schemas/group.schema';

@Wizard('config')
export class ConfigWizard {

    constructor(){}


  @WizardStep(1)
  async step1(@Ctx() ctx: Scenes.WizardContext) {
    const group: Group = ctx.wizard.state['group']
    if(group && group.admin == `${ctx.message?.from.id}`){
        await ctx.reply(`
Menu (responder solo con el numero):
    1. Agregar o remover usuario
    2. Actualizar archivo
    3. Agregar o eliminar categorias
    4. Agregar o eliminar cuentas
    5. Agregar o eliminar titulares
            `)
        await ctx.wizard.next()
    } else {
        await ctx.reply(`No posees permisos para configurar el grupo.`)
        ctx.scene.leave()
    }
  }

  @WizardStep(2)
  async switchMenu(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message){
        const option: number = parseInt(ctx.message['text'])
        if(!isNaN(option) && 0 < option && option < 6 ){
            switch (option) {
                case 1:
                    this.changeScene(ctx, 'users')
                    break;

                case 2:
                    this.changeScene(ctx, 'file')
                    break;

                case 3:
                    this.changeScene(ctx, 'categories')
                    break;

                case 4:
                    this.changeScene(ctx, 'accounts')
                    break;

                case 5:
                    this.changeScene(ctx, 'holders')
                    break;
            
                default:
                    await ctx.reply(`La opcion elegida no es valida.`)
                    break;
            }
        }
    }
  }

  private changeScene = async (ctx: Scenes.WizardContext, scene: string) => {
    const group: Group = ctx.wizard.state['group']
    await ctx.scene.leave()
    await ctx.scene.enter(scene, {group: group})
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
