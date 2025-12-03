import { Injectable } from '@nestjs/common'
import * as ExcelJS from 'exceljs';
import * as path from 'path'
import * as fs from 'fs';
import { throwError } from 'rxjs';

class Concept{
    concept: string
    count: number
    debitos: number
    creditos: number
    balance: number
}

class DetailedConcept extends Concept{
  month: string
}

const reg = /^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)-\d{4}$/


@Injectable()
export class ExcelService {
    private dir = path.join(__dirname, '/tmp');

async readExcel(fileBuffer: any) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const result: Concept[] = [];
    const concepts: DetailedConcept[] = []
    const acumulated_balance: Concept = {
          concept: `Balance acumulado`,
          count: 0,
          debitos: 0,
          creditos: 0,
          balance: 0
        }

    workbook.eachSheet((worksheet, sheetId) => {
      const match = worksheet.name.trim().match(reg)
      if(!match) return

      worksheet.eachRow((row, rowNumber) => {
        if(rowNumber < 5) return
        const values = row.values;

        if (!Array.isArray(values)|| !values[1] || values[1]?.toString().trim() == '') return;

        

        let concept: DetailedConcept = {
                concept: ``,
                count: 0,
                debitos: 0,
                creditos: 0,
                balance: 0,
                month: worksheet.name
              }
        values.forEach(
          (v, index) => {
            if(v){
              switch (index) {
                case 1:
                  concept.concept = `${v.toString().trim()}`
                  break;
                case 3:
                  concept.debitos = this.toNumber(v)
                  break
                case 4:
                  concept.creditos = this.toNumber(v)
                  break
                default:
                  break;
              }
            }
          }
        );
        concepts.push(concept)
      });
    });

    concepts.sort((a, b) => a.concept.toLowerCase().localeCompare(b.concept.toLowerCase()))


    return concepts;
  } catch (error) {
    console.log(error)
    throw new Error("Error con el archivo");
  }
  }


  async createExcelReport(concepts: DetailedConcept[]): Promise<string> {

    let result: Concept[] = []
    concepts.forEach(x => {
      const concept = result.find(y => `${y.concept.toUpperCase()}` == `${x.concept.toUpperCase()}`)
      if(concept){
        concept.count++
        concept.debitos = this.toNumber(concept.debitos + this.toNumber(x.debitos))
        concept.creditos = this.toNumber(concept.creditos + this.toNumber(x.creditos))
        concept.balance = this.toNumber(concept.balance - this.toNumber(x.debitos) + this.toNumber(x.creditos))
      } else {
        result.push({
            concept: `${x.concept}`, 
            count: 1, 
            creditos: this.toNumber(x.creditos), 
            debitos: this.toNumber(x.debitos),
            balance: this.toNumber(x.creditos) - this.toNumber(x.debitos),
        })
      }
    })

    const saldos = result.find(x => x.concept == 'saldos')
    result = result.filter(x => x != saldos)
    result.sort((a, b) => a.concept.toLowerCase().localeCompare(b.concept.toLowerCase()))

    if(saldos){
      result.push(saldos)
    }

    const rowsToArray: any[][] = [['Concepto', 'Count', 'DEBE acum', 'HABER acum', 'Balance']]
    for(const row of result){
        rowsToArray.push([
            row.concept, row.count, row.debitos, row.creditos, row.balance
        ])
    }

    // 1. Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // 2. Agregar filas
    rowsToArray.forEach(row => worksheet.addRow(row));

    // 3. Formato automático para números (opcional)
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';  // Formato con decimales
        }
      });
    });

    // 4. Crear carpeta /tmp si no existe (Koyeb y Linux)
    const dir = '/tmp';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 5. Archivo destino
    const filePath = path.join(dir, `result.xlsx`);

    // 6. Guardar archivo
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }

  /**
   * 
   */
  public async createDetailedReport(concepts: DetailedConcept[]){
    const result: DetailedConcept[] = []
    concepts.forEach(x => {
      const concept = result.find(y => `${y.concept.toUpperCase()}` == `${x.concept.toUpperCase()}-ACUM`)
      if(concept){
          concept.count++
          concept.debitos = this.toNumber(concept.debitos + this.toNumber(x.debitos))
          concept.creditos = this.toNumber(concept.creditos + this.toNumber(x.creditos))
          concept.balance = this.toNumber(concept.balance - this.toNumber(x.debitos) + this.toNumber(x.creditos))
      } else {
          result.push({
              concept: `${x.concept}-ACUM`, 
              count: 1, 
              creditos: this.toNumber(x.creditos), 
              debitos: this.toNumber(x.debitos),
              balance: this.toNumber(x.creditos) - this.toNumber(x.debitos),
              month: ''
          })
      }
      result.push(x) 
    })

    result.sort((a, b) => a.concept.toLowerCase().localeCompare(b.concept.toLowerCase()))
    
    const rowsToArray: any[][] = [['Concepto', 'Mes', 'DEBE acum', 'HABER acum', 'Balance']]
    for(const row of result){
        rowsToArray.push([
            row.concept, row.month, row.debitos, row.creditos, row.balance
        ])
    }

    // 1. Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte detallado');

    // 2. Agregar filas
    rowsToArray.forEach(row => worksheet.addRow(row));

    // 3. Formato automático para números (opcional)
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';  // Formato con decimales
        }
      });
    });

    // 4. Crear carpeta /tmp si no existe (Koyeb y Linux)
    const dir = '/tmp';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 5. Archivo destino
    const filePath = path.join(dir, `result.xlsx`);

    // 6. Guardar archivo
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }


  /**
   *   Convert any kind of object to a number
   *  
   */
  private toNumber(x: any){
    let number = parseFloat(x)
    if(x.result){
      number = parseFloat(x.result)
    }
    
    if(isNaN(number)){
        number = 0
    }

    return Math.round(number*100)/100
  }

}
