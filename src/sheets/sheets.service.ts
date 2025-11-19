import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Group } from 'src/schemas/group.schema';
import { Observation, ObservationAccount, ObservationHolder } from './observation.model';

@Injectable()
export class SheetsService {
  private sheets;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'src/config/lunar-ensign-383015-7bffe1cbfd80.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
}


  async pushData(values: (string|number)[], group: Group) {
    await this.sheets.spreadsheets.values.update({
        spreadsheetId: group.spreadsheet.id,
        range: `${group.spreadsheet.balance_sheet.name}!A4:H4`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [values]
        }
    });
  }

  public addRow = async (group: Group) => {
    await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: group.spreadsheet.id,
        requestBody: {
            requests: [
            {
                insertDimension: {
                range: {
                    sheetId: group.spreadsheet.balance_sheet.id,
                    dimension: 'ROWS',
                    startIndex: 3,
                    endIndex: 4
                },
                inheritFromBefore: false
                }
            }
            ]
        }
    })

    await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: group.spreadsheet.id,
        requestBody: {
            requests: [
            {
                copyPaste: {
                source: {
                    sheetId: group.spreadsheet.balance_sheet.id,         
                    startRowIndex: 4,     
                    endRowIndex: 5,
                    startColumnIndex: 8,   
                    endColumnIndex: 9
                },
                destination: {
                    sheetId: group.spreadsheet.balance_sheet.id,          
                    startRowIndex: 3,      
                    endRowIndex: 4,
                    startColumnIndex: 8,
                    endColumnIndex: 9
                },
                pasteType: 'PASTE_FORMULA'
                }
            }
            ]
        }
        });

  };

  public getObservableData = async (group: Group): Promise<Observation> => {
    const holders: string[] = group.holders
    const accounts: string[] = group.accounts
    const data = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId: group.spreadsheet.id,
        ranges: [
            `${group.spreadsheet.observation_sheet.name}!A3:A${accounts.length + 5}`,
            `${group.spreadsheet.observation_sheet.name}!C3:${this.nextColumn('C', holders.length)}${accounts.length + 5}`
        ]
    })

    const observation: Observation = new Observation()
    const accounts_order = data.data.valueRanges[0].values.map((element) => {
        return element[0]
    })
    const holders_order = data.data.valueRanges[1].values[0].map((element) => {
        return element
    });

    await holders_order.forEach(async (holder, i) => {
        const new_holder: ObservationHolder = new ObservationHolder(holder)
        await data.data.valueRanges[1].values.forEach((element, index) => {
            if(accounts_order[index] && accounts_order[index] != 'Cuenta'){
                const account: ObservationAccount = new ObservationAccount(accounts_order[index], element[i] ?? 0)
                new_holder.accounts.push(account)
            }
        });
        observation.holders.push(new_holder)
    })
    
    return observation
  }




  /**
   * 
   */
  private nextColumn(col: string, offset: number): string {
  // Convertir letra → número (A=1, B=2...)
  const colNum =
    col
      .toUpperCase()
      .split('')
      .reduce((r, c) => r * 26 + (c.charCodeAt(0) - 64), 0);

  return this.numberToColumn(colNum + offset);
}

private numberToColumn(n: number): string {
  let col = '';
  while (n > 0) {
    const mod = (n - 1) % 26;
    col = String.fromCharCode(65 + mod) + col;
    n = Math.floor((n - mod) / 26);
  }
  return col;
}

}

