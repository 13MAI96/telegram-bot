import { DashboardDataService } from './dashboard-data.service';

describe('DashboardDataService', () => {
    const service = new DashboardDataService();
    const baseDate = new Date(2026, 4, 12, 12);

    it('parses supported month inputs', () => {
        expect(service.parseMonth('05/2026', baseDate)).toMatchObject({
            month: 5,
            year: 2026,
            label: '05/2026',
        });
        expect(service.parseMonth('actual', baseDate)).toMatchObject({
            month: 5,
            year: 2026,
        });
        expect(service.parseMonth('pasado', baseDate)).toMatchObject({
            month: 4,
            year: 2026,
        });
        expect(service.parseMonth('Mayo', baseDate)).toMatchObject({
            month: 5,
            year: 2026,
        });
        expect(service.parseMonth('13/2026', baseDate)).toBeNull();
    });

    it('validates all and comma-separated selections case-insensitively', () => {
        expect(service.parseSelection('todos', ['Ana', 'Beto'])).toEqual({
            values: ['Ana', 'Beto'],
            all: true,
        });
        expect(service.parseSelection('ana, BETO', ['Ana', 'Beto'])).toEqual({
            values: ['Ana', 'Beto'],
            all: false,
        });
        expect(service.parseSelection('Ana, Otro', ['Ana', 'Beto'])).toEqual({
            invalidValues: ['Otro'],
        });
    });

    it('validates excluded categories by index', () => {
        expect(
            service.parseExcludedCategories('1, 3', [
                'Comida',
                'Transporte',
                'Servicios',
            ]),
        ).toEqual({
            values: ['Comida', 'Servicios'],
            all: false,
        });
        expect(service.parseExcludedCategories('ninguna', ['Comida'])).toEqual({
            values: [],
            all: false,
        });
        expect(service.parseExcludedCategories('todos', ['Comida'])).toEqual({
            values: ['Comida'],
            all: true,
        });
        expect(service.parseExcludedCategories('9', ['Comida'])).toEqual({
            invalidValues: ['9'],
        });
    });

    it('aggregates monthly debit expenses by category and filters', () => {
        const dashboard = service.aggregateExpenseCategories(
            [
                {
                    date: '12/05/2026',
                    category: 'Comida',
                    description: 'Cafe',
                    account: 'EFECTIVO',
                    holder: 'Ana',
                    debit: 100,
                    credit: 0,
                },
                {
                    date: '13/05/2026',
                    category: 'Comida',
                    description: 'Pan',
                    account: 'EFECTIVO',
                    holder: 'Ana',
                    debit: 50,
                    credit: 0,
                },
                {
                    date: '14/05/2026',
                    category: 'Sueldo',
                    description: 'Cobro',
                    account: 'EFECTIVO',
                    holder: 'Ana',
                    debit: 0,
                    credit: 1000,
                },
                {
                    date: '14/04/2026',
                    category: 'Comida',
                    description: 'Viejo',
                    account: 'EFECTIVO',
                    holder: 'Ana',
                    debit: 80,
                    credit: 0,
                },
                {
                    date: '14/05/2026',
                    category: 'Transporte',
                    description: 'Taxi',
                    account: 'BANCO',
                    holder: 'Ana',
                    debit: 25,
                    credit: 0,
                },
            ],
            { month: 5, year: 2026, label: '05/2026' },
            {
                holders: ['Ana'],
                accounts: ['EFECTIVO'],
                excludedCategories: [],
                allHolders: false,
                allAccounts: false,
            },
        );

        expect(dashboard.total).toBe(150);
        expect(dashboard.categories).toEqual([
            {
                category: 'Comida',
                amount: 150,
                percentage: 100,
            },
        ]);
    });

    it('excludes selected categories from aggregation', () => {
        const dashboard = service.aggregateExpenseCategories(
            [
                {
                    date: '12/05/2026',
                    category: 'Comida',
                    description: 'Cafe',
                    account: 'EFECTIVO',
                    holder: 'Ana',
                    debit: 100,
                    credit: 0,
                },
                {
                    date: '12/05/2026',
                    category: 'Transporte',
                    description: 'Taxi',
                    account: 'EFECTIVO',
                    holder: 'Ana',
                    debit: 80,
                    credit: 0,
                },
            ],
            { month: 5, year: 2026, label: '05/2026' },
            {
                holders: ['Ana'],
                accounts: ['EFECTIVO'],
                excludedCategories: ['Comida'],
                allHolders: false,
                allAccounts: false,
            },
        );

        expect(dashboard.total).toBe(80);
        expect(dashboard.categories).toEqual([
            {
                category: 'Transporte',
                amount: 80,
                percentage: 100,
            },
        ]);
    });
});
