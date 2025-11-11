import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class SheetsService {
  private sheets;
  private spreadsheetId = process.env.ID_SPREADSHEET
  private sheetId = process.env.SHEET_ID
  private sheetName = process.env.SHEET_NAME

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'src/config/lunar-ensign-383015-7bffe1cbfd80.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
}


  async pushData(values: (string|number)[]) {
    await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A4:H4`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [values]
        }
    });
  }

  public addRow = async () => {
    const sheetId = process.env.SHEET_ID 
    await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
            requests: [
            {
                insertDimension: {
                range: {
                    sheetId: this.sheetId,
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
        spreadsheetId: this.spreadsheetId,
        requestBody: {
            requests: [
            {
                copyPaste: {
                source: {
                    sheetId: sheetId,         
                    startRowIndex: 4,     
                    endRowIndex: 5,
                    startColumnIndex: 8,   
                    endColumnIndex: 9
                },
                destination: {
                    sheetId: sheetId,          
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

}

