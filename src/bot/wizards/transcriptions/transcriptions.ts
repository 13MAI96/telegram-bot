import { Wizard, WizardStep, Ctx, Hears, Command, On } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { CsvService } from 'src/shared/services/csv/csv.service';
import * as ExcelJs from 'exceljs';
import * as fs from 'fs';
import { ExcelService } from 'src/shared/services/excel/excel.service';
import { throwError } from 'rxjs';
import { WhisperService } from 'src/whisper/whisper.service';

@Wizard('espe')
export class EspeWizard {
    private readonly whisper = new WhisperService();
    constructor() {}

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
    @On('document')
    async handleDoc(@Ctx() ctx: Scenes.WizardContext) {
        const doc = ctx.message ? ctx.message['document'] : null;

        if (doc.mime_type === 'audio/*') {
            await ctx.reply(`Recibi el archivo, dejame ver que puedo hacer`);
            const fileId = doc.file_id as string;
            const file = await ctx.telegram.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

            try {
                const uint8 = await this.tryToGet(fileUrl);
                if (!uint8) {
                    throwError(() => 'No se puede obtener');
                }
                let obj: string = ctx.wizard.state['obj'];
                await ctx.reply(
                    `Ya descargue el archivo, voy a intentar analizarlo.`,
                );
                obj = await this.whisper.requestTranscription(uint8);
                ctx.wizard.state['obj'] = obj;
                await ctx.reply(obj);

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
            const uint8 = new Uint8Array(res);
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
