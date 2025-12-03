import { Injectable } from '@nestjs/common'
import * as ExcelJS from 'exceljs';
import * as path from 'path'
import * as fs from 'fs';

class Concept{
    concept: string
    count: number
    debitos: number
    creditos: number
    balance: number
}


@Injectable()
export class CsvService {
    private dir = path.join(__dirname, '/tmp');

    private sanitizeCsv(csv: string): string {
        return csv.replace(/"([^"]*)"/g, (match, inner) => {
            const cleaned = inner
            .trim()
            .replace(/\./g, '')     // remover puntos de miles
            .replace(/,/g, '.');    // convertir coma decimal

            return cleaned;
        });
    }

  public csvToJson(csv: string, obj: Concept[]): Concept[] { 
    /**
     * Formato especifico del ejemplo
     */
    const cleaned = this.sanitizeCsv(csv)
    const [...lines] = cleaned.split('\n');
    const headerLine = lines[2]
    const headers = headerLine.split(',').map(h => h.trim());
    // const [headerLine, ...lines] = csv.split('\n');
    // const headers = headerLine.split(',').map(h => h.trim());

    const json = lines.slice(4).map(line => {
        const values: string[] = line.split(',').map(v => v.trim());
        return Object.fromEntries(headers.map((h, i) => [i == 0 ? 'CONCEPTO' : h, values[i]]));
    });

    const result = json.filter(x => x.CONCEPTO != '')
    const concepts: Concept[] = obj ?? []
    result.forEach(x => {
        const concept = concepts.find(y => y.concept == x.CONCEPTO)
        if(concept){
            concept.count++
            concept.debitos = concept.debitos + this.toNumber(x.DEBE)
            concept.creditos = concept.creditos + this.toNumber(x.HABER)
            concept.balance = concept.balance - this.toNumber(x.DEBE) + this.toNumber(x.HABER)
        } else {
            concepts.push({
                concept: x.CONCEPTO, 
                count: 1, 
                creditos: this.toNumber(x.HABER), 
                debitos: this.toNumber(x.DEBE),
                balance: this.toNumber(x.HABER) - this.toNumber(x.DEBE)
            })
        }
    })

    return concepts;
  }

  createCsv(data: Concept[]): string {
    if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir, { recursive: true });
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');

    const csv = `${headers}\n${rows}`;

    const filePath = `${this.dir}/report.csv`;
    fs.writeFileSync(filePath, csv, { encoding: 'utf8' });

    return filePath;
  }

  private toNumber(x: any){
    let number = parseFloat(x)
    if(isNaN(number)){
        number = 0
    }

    return Math.round(number*100)/100
  }

  async createExcelReport(rows: any[]): Promise<string> {
    const rowsToArray: any[][] = [['Concepto', 'Count', 'DEBE acum', 'HABER acum', 'Balance']]
    for(const row of rows){
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


}
