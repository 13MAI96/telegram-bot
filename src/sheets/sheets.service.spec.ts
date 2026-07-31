import { SheetsService } from './sheets.service';

describe('SheetsService transaction movements', () => {
    it('reads the latest five Caja movements filtered by account and holder', async () => {
        const service = new SheetsService();
        (service as any).sheets = {
            spreadsheets: {
                values: {
                    get: jest.fn().mockResolvedValue({
                        data: {
                            values: [
                                [
                                    '12/05/2026',
                                    'Comida',
                                    'Cafe',
                                    'EFECTIVO',
                                    'Tester',
                                    100,
                                    0,
                                    'Tester',
                                ],
                                [
                                    '11/05/2026',
                                    'Sueldo',
                                    'Cobro',
                                    'BANCO',
                                    'Tester',
                                    0,
                                    1000,
                                    'Tester',
                                ],
                                [
                                    '10/05/2026',
                                    'Comida',
                                    'Pan',
                                    'EFECTIVO',
                                    'Tester',
                                    20,
                                    0,
                                    'Tester',
                                ],
                                [
                                    '09/05/2026',
                                    'Comida',
                                    'Taxi',
                                    'EFECTIVO',
                                    'Tester',
                                    30,
                                    0,
                                    'Tester',
                                ],
                                [
                                    '08/05/2026',
                                    'Comida',
                                    'Almuerzo',
                                    'EFECTIVO',
                                    'Tester',
                                    40,
                                    0,
                                    'Tester',
                                ],
                                [
                                    '07/05/2026',
                                    'Comida',
                                    'Cena',
                                    'EFECTIVO',
                                    'Tester',
                                    50,
                                    0,
                                    'Tester',
                                ],
                                [
                                    '06/05/2026',
                                    'Comida',
                                    'Extra',
                                    'EFECTIVO',
                                    'Tester',
                                    60,
                                    0,
                                    'Tester',
                                ],
                            ],
                        },
                    }),
                },
            },
        };

        const movements = await service.getLatestCashMovements(
            { spreadsheet: { id: 'sheet-id' } } as any,
            'efectivo',
            'tester',
        );

        expect(movements).toHaveLength(5);
        expect(movements[0]).toMatchObject({
            date: '12/05/2026',
            description: 'Cafe',
            debit: 100,
            credit: 0,
        });
        expect(movements[4].description).toBe('Cena');
    });

    it('propagates Caja read failures', async () => {
        const service = new SheetsService();
        (service as any).sheets = {
            spreadsheets: {
                values: {
                    get: jest.fn().mockRejectedValue(new Error('read failed')),
                },
            },
        };

        await expect(
            service.getLatestCashMovements(
                { spreadsheet: { id: 'sheet-id' } } as any,
                'EFECTIVO',
                'Tester',
            ),
        ).rejects.toThrow('read failed');
    });
});
