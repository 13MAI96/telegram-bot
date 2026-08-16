import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { Group } from 'src/schemas/group.schema';
import {
    Observation,
    ObservationAccount,
    ObservationHolder,
} from './observation.model';
import { TransactionMovement } from './transaction-movement.model';

@Injectable()
export class SheetsService {
    private readonly logger = new Logger(SheetsService.name);
    private sheets;
    private credentials = JSON.parse(process.env.GOOGLE_API_JSON!);

    constructor() {
        const auth = new google.auth.GoogleAuth({
            credentials: this.credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheets = google.sheets({ version: 'v4', auth });
    }

    async pushData(values: (string | number)[], group: Group) {
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: group.spreadsheet.id,
            range: `${group.spreadsheet.balance_sheet.name}!A4:H4`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [values],
            },
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
                                endIndex: 4,
                            },
                            inheritFromBefore: false,
                        },
                    },
                ],
            },
        });

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
                                endColumnIndex: 9,
                            },
                            destination: {
                                sheetId: group.spreadsheet.balance_sheet.id,
                                startRowIndex: 3,
                                endRowIndex: 4,
                                startColumnIndex: 8,
                                endColumnIndex: 9,
                            },
                            pasteType: 'PASTE_FORMULA',
                        },
                    },
                ],
            },
        });
    };

    async appendBalanceRow(values: (string | number)[], group: Group) {
        try {
            await this.addRow(group);
            await this.pushData(values, group);
        } catch (error) {
            this.logger.error(
                `Failed to append row to spreadsheet ${group.spreadsheet.id}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw error;
        }
    }

    async getLatestCashMovements(
        group: Group,
        account: string,
        holder: string,
        limit = 5,
    ): Promise<TransactionMovement[]> {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: group.spreadsheet.id,
                range: 'Caja!A:H',
            });

            const rows: unknown[][] = response.data.values ?? [];
            return rows
                .map((row) => this.mapCashMovement(row))
                .filter((movement): movement is TransactionMovement =>
                    Boolean(movement),
                )
                .filter(
                    (movement) =>
                        movement.account.toLowerCase() ===
                            account.toLowerCase() &&
                        movement.holder.toLowerCase() === holder.toLowerCase(),
                )
                .slice(0, limit);
        } catch (error) {
            this.logger.error(
                `Failed to read cash movements from spreadsheet ${group.spreadsheet.id}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw error;
        }
    }

    async getCashMovements(group: Group): Promise<TransactionMovement[]> {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: group.spreadsheet.id,
                range: 'Caja!A:H',
            });

            const rows: unknown[][] = response.data.values ?? [];
            return rows
                .map((row) => this.mapCashMovement(row))
                .filter((movement): movement is TransactionMovement =>
                    Boolean(movement),
                );
        } catch (error) {
            this.logger.error(
                `Failed to read cash movements from spreadsheet ${group.spreadsheet.id}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw error;
        }
    }

    async getSheetIdByName(
        spreadsheetId: string,
        sheetName: string,
    ): Promise<string | null> {
        const response = await this.sheets.spreadsheets.get({
            spreadsheetId,
            fields: 'sheets.properties(sheetId,title)',
        });

        const normalizedSheetName = sheetName.trim().toLowerCase();
        const sheet = response.data.sheets?.find(
            (entry) =>
                entry.properties?.title?.trim().toLowerCase() ===
                normalizedSheetName,
        );

        if (sheet?.properties?.sheetId === undefined) {
            return null;
        }

        return String(sheet.properties.sheetId);
    }

    public getObservableData = async (group: Group): Promise<Observation> => {
        const holders: string[] = group.holders;
        const accounts: string[] = group.accounts;
        const data = await this.sheets.spreadsheets.values.batchGet({
            spreadsheetId: group.spreadsheet.id,
            ranges: [
                `${group.spreadsheet.observation_sheet.name}!A3:A${accounts.length + 5}`,
                `${group.spreadsheet.observation_sheet.name}!C3:${this.nextColumn('C', holders.length)}${accounts.length + 5}`,
            ],
        });

        const observation: Observation = new Observation();
        const accounts_order = data.data.valueRanges[0].values.map(
            (element) => {
                return element[0];
            },
        );
        const holders_order = data.data.valueRanges[1].values[0].map(
            (element) => {
                return element;
            },
        );

        await holders_order.forEach(async (holder, i) => {
            const new_holder: ObservationHolder = new ObservationHolder(holder);
            await data.data.valueRanges[1].values.forEach((element, index) => {
                if (
                    accounts_order[index] &&
                    accounts_order[index] != 'Cuenta'
                ) {
                    const account: ObservationAccount = new ObservationAccount(
                        accounts_order[index],
                        element[i] ?? 0,
                    );
                    new_holder.accounts.push(account);
                }
            });
            observation.holders.push(new_holder);
        });

        return observation;
    };

    /**
     *
     */
    private nextColumn(col: string, offset: number): string {
        // Convertir letra → número (A=1, B=2...)
        const colNum = col
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

    private mapCashMovement(row: unknown[]): TransactionMovement | null {
        const [date, category, description, account, holder, debit, credit] =
            row;
        if (!date || !description || !account || !holder) {
            return null;
        }

        return {
            date: String(date),
            category: category ? String(category) : 'Sin categoría',
            description: String(description),
            account: String(account),
            holder: String(holder),
            debit: this.toMovementNumber(debit),
            credit: this.toMovementNumber(credit),
        };
    }

    private toMovementNumber(value: unknown): number {
        if (typeof value === 'number') {
            return value;
        }

        if (!value) {
            return 0;
        }

        const raw = String(value).replace(/[^\d,.-]/g, '');
        const hasComma = raw.includes(',');
        const hasDot = raw.includes('.');
        const normalized = this.normalizeMovementNumber(raw, hasComma, hasDot);
        const parsed = Number(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    private normalizeMovementNumber(
        raw: string,
        hasComma: boolean,
        hasDot: boolean,
    ): string {
        if (hasComma && hasDot) {
            const lastComma = raw.lastIndexOf(',');
            const lastDot = raw.lastIndexOf('.');

            return lastComma > lastDot
                ? raw.replace(/\./g, '').replace(',', '.')
                : raw.replace(/,/g, '');
        }

        if (hasComma) {
            return raw.replace(',', '.');
        }

        return raw;
    }
}
