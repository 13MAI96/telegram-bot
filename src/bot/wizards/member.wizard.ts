import { Wizard, WizardStep, Ctx, Hears, Command } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Sheet } from 'src/schemas/sheet.schema';
import { CreateGroupDto } from 'src/group/dto/create-group.dto';
import { GroupService } from 'src/group/group.service';
import { TokenService } from 'src/token/token.service';
import { Group } from 'src/schemas/group.schema';
import { User } from 'src/schemas/user.schema';

@Wizard('member')
export class MemberWizard {
    constructor(
        private groupService: GroupService,
        private tokenService: TokenService
    ){}


  @WizardStep(1)
  async start(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(
        `
Bien, para esto voy a necesitar que estes en contacto con el admin del grupo.
El primer dato que voy a necesitar es el id, el admin lo puede obtener desde la config.
Cuando lo tengas me lo podes enviar.
        `
    );
    await ctx.wizard.next();
  }

  @WizardStep(2)
  async validateId(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message && ctx.message['text']){
      const id = ctx.message['text']
      const group = await this.groupService.findByAdmin(id)
      if(group){
        ctx.wizard.state['group'] = group
        await ctx.reply(
            `Perfecto, ya encontre el grupo. Ahora voy a necesitar el token que le envie al admin.
            `
        )
        await ctx.wizard.next()
      } else {
        await ctx.reply(`Necesito un ID valido para continuar.`)
      }
    } else {
      await ctx.reply(
        `Quedo a la espera del ID...
        `
      )
    }
  }

  @WizardStep(3)
  async validateToken(@Ctx() ctx: Scenes.WizardContext){
    if(ctx.message && ctx.message['text']){
      const token = ctx.message['text']
      const group: Group = ctx.wizard.state['group']
      const token_status = await this.tokenService.validateAndUseToken(token)
      const user: User = {id: `${ctx.message.from.id}`, name: ctx.message.from.first_name}
      if(token_status){
        group.users.push(user)
        await ctx.reply(
            `Bien, dame unos segundos que actualizo la informacion.
            `
        )
        await this.groupService.update(group._id, group)
        await ctx.reply(`Listo, ya puedes operar en tu nuevo grupo.`)
        await ctx.scene.leave()
      } else {
        await ctx.reply(`Tu token es invalido o ya expiro, por favor solicitarlo nuevamente.`)
      }
    } else {
      await ctx.reply(
        `Quedo a la espera del token...
        `
      )
    }
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
