import { Wizard, WizardStep, Ctx, Hears, Command, On } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { throwError } from 'rxjs';
import { WhisperService } from 'src/whisper/whisper.service';

@Wizard('transcription')
export class TranscriptionWizard {
    constructor(private whisper: WhisperService) {}

    @WizardStep(1)
    async start(@Ctx() ctx: Scenes.WizardContext) {
        await ctx.reply(
            `
Hola, Podrias enviarme el archivo a procesar?
        `,
        );
        await ctx.wizard.next();
    }

    @WizardStep(2)
    @On(['audio', 'document', 'voice'])
    async handleDoc(@Ctx() ctx: Scenes.WizardContext) {
        const audio = ctx.message ? ctx.message['audio'] : null;
        const doc = ctx.message ? ctx.message['document'] : null;
        let fileUrl = '';
        if (audio) {
            await ctx.reply(`Recibi el archivo, dejame ver que puedo hacer`);
            const fileId = audio.file_id as string;
            const file = await ctx.telegram.getFile(fileId);
            fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
        } else if (doc.mime_type === 'audio/*') {
            await ctx.reply(`Recibi el archivo, dejame ver que puedo hacer`);
            const fileId = doc.file_id as string;
            const file = await ctx.telegram.getFile(fileId);
            fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
        }
        if (fileUrl) {
            try {
                const uint8 = await this.tryToGet(fileUrl);
                if (!uint8) {
                    throwError(() => 'No se puede obtener');
                }
                await ctx.reply(
                    `Ya descargue el archivo dura ${(audio.duration / 60).toPrecision(2)}m, voy a intentar analizarlo.`,
                );
                const res = await this.whisper.requestTranscription(
                    uint8,
                    ctx.chat?.id,
                );

                if (res)
                    await ctx.reply(
                        'Ya lo tiene whisper, te aviso cuando tenga novedades.',
                    );

                await ctx.scene.leave();
                return;
            } catch (error) {
                console.log(error);
                await ctx.reply(
                    `Tuve un problema con el archivo. Podrias enviarlo otra vez?`,
                );
                return;
            }
        } else if (!doc.mime_type.includes('audio')) {
            await ctx.reply('Por favor enviame un archivo de audio.');
            return;
        }
    }

    @Command('cancelar')
    async cancelAll(@Ctx() ctx: Scenes.WizardContext) {
        if (ctx.scene?.current) {
            console.log(ctx.wizard.step);
            await ctx.reply('❌ Proceso cancelado.');
            await ctx.scene.leave();
        } else {
            await ctx.reply('No hay una conversación activa.');
        }
    }

    async tryToGet(
        fileUrl: string,
        fail: { status: boolean; count: number } | null = null,
    ) {
        if (!fail) {
            fail = { status: true, count: 0 };
        }
        try {
            const res = await fetch(fileUrl).then((res) => res.arrayBuffer());
            const uint8 = Buffer.from(res);
            return uint8;
        } catch {
            if (fail.count < 3) {
                return;
            } else {
                fail.count++;
                console.log(fail.count);
                await this.tryToGet(fileUrl, fail);
            }
        }
    }
}
