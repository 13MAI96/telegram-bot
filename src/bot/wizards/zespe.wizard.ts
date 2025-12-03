import { Wizard, WizardStep, Ctx, Hears, Command, On } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { CsvService } from 'src/shared/services/csv.service';
import * as ExcelJs from 'exceljs'
import * as fs from 'fs'
import { ExcelService } from 'src/shared/services/excel.service';
import { throwError } from 'rxjs';

@Wizard('espe')
export class EspeWizard {
    constructor(
        private csvService: CsvService,
        private excelService: ExcelService
    ){}


  @WizardStep(1)
  async start(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(
        `
Hola Espe, Podrias enviar el primer archivo a procesar?
        `
    );
    await ctx.wizard.next();
  }

  @WizardStep(2)
  @On('document')
  async handleDoc(@Ctx() ctx: Scenes.WizardContext){
    const doc = ctx.message ? ctx.message['document'] : null

    if(doc.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){
      await ctx.reply(`Recibi un archivo excel, dejame ver que puedo hacer`)
      const fileId = doc.file_id;
      const file = await ctx.telegram.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

      try {
        const uint8 = await this.tryToGet(fileUrl)
        if(!uint8){
          throwError(()=> 'No se puede obtener') 
        }
        let obj: any  = ctx.wizard.state['obj']
        await ctx.reply(`Ya descargue el archivo, voy a intentar analizarlo.`)
        obj = await this.excelService.readExcel(uint8);
        ctx.wizard.state['obj'] = obj
        await ctx.reply(
`Ya analice el archivo, que tipo de resumen queres:
1. General: solo te doy los totales ordenados alfabeticamente
2. Detallado: te doy los totales, pero agrego cada uno de los items que contemple incluyendo el mes de transaccion`);

        await ctx.wizard.selectStep(3)
        return
      } catch (error) {
        console.log(error)
        await ctx.reply(`Tuve un problema con el archivo. Podrias enviarlo otra vez?`)
        return
      }

    } else if (!doc.mime_type.includes('csv')) {
      await ctx.reply('Por favor enviame un archivo CSV.');
      return;
    }

    const fileId = doc.file_id;
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;


    try {
      const res = await fetch(fileUrl);
      const csv = await res.text();
      let obj: any[]  = ctx.wizard.state['obj']

      obj = this.csvService.csvToJson(csv, obj);
    
      ctx.wizard.state['obj'] = obj

      await ctx.reply('CSV recibido! Ya lo analice, tenes que sumar algun otro CSV? Mandame el siguiente archivo o listo para recibir el resultado.');
      await ctx.wizard.selectStep(1)
    
    } catch (error) {
      await ctx.reply(`No pude recuperar el archivo. Podrias enviarlo otra vez?`)
      return ctx.wizard.selectStep(1)
    }

  }

  @WizardStep(2)
  @Hears(/listo/i)
  async returnAnalisys(@Ctx() ctx: Scenes.WizardContext){
    const obj = ctx.wizard.state['obj']
    const csvPath = await this.csvService.createExcelReport(obj);

    await ctx.replyWithDocument({
      source: fs.createReadStream(csvPath),
      filename: 'reporte.xlsx',
    });
    fs.unlinkSync(csvPath);
    await ctx.scene.leave()
  }

  @WizardStep(3)
  async step3(@Ctx() ctx: Scenes.WizardContext){
    await ctx.wizard.next()
  }

  @WizardStep(4)
  async step6(@Ctx() ctx: Scenes.WizardContext) {
    if(ctx.message){
        const option = parseInt(ctx.message['text']);
        if (isNaN(option) || option < 1 || option > 3) {
          await ctx.reply('Opcion no valida, mandame solo el numero:');
          return;
        }
      const obj = ctx.wizard.state['obj']

      switch (option) {
        case 1:
          await ctx.reply(`Oka, dame unos segundos y te dejo el archivo.`)
          const generalReport = await this.excelService.createExcelReport(obj);
          await ctx.replyWithDocument({
            source: fs.createReadStream(generalReport),
            filename: 'reporte.xlsx',
          });
          fs.unlinkSync(generalReport);
          await ctx.scene.leave()
          break;
        case 2:
          await ctx.reply(`Oka, dame unos segundos y te dejo el archivo.`)
          const detailedReport = await this.excelService.createDetailedReport(obj);
          await ctx.replyWithDocument({
            source: fs.createReadStream(detailedReport),
            filename: 'reporte-detallado.xlsx',
          });
          fs.unlinkSync(detailedReport);
          await ctx.scene.leave()
          break; 
        default:
          break;
      }
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


  async tryToGet(fileUrl, fail: {status: boolean, count: number} | null = null){
    if(!fail){
      fail = {status: true, count: 0}
    }
    try{
      const res = await fetch(fileUrl).then(res => res.arrayBuffer());
      const uint8 = new Uint8Array(res);
      return uint8
    } catch {
      if(fail.count < 3){
        return 
      } else {
        fail.count++
        console.log(fail.count)
        this.tryToGet(fileUrl, fail)
      }
    }
  }
}
