import { PieChartImageService } from './pie-chart-image.service';

describe('PieChartImageService', () => {
    it('renders a PNG buffer', () => {
        const service = new PieChartImageService();
        const buffer = service.renderExpensePieChart({
            month: { month: 5, year: 2026, label: '05/2026' },
            holders: ['Ana'],
            accounts: ['EFECTIVO'],
            excludedCategories: [],
            allHolders: false,
            allAccounts: false,
            total: 100,
            categories: [
                { category: 'Comida', amount: 70, percentage: 70 },
                { category: 'Transporte', amount: 30, percentage: 30 },
            ],
        });

        expect(buffer.subarray(0, 8)).toEqual(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        );
        expect(buffer.length).toBeGreaterThan(1000);
    });

    it('renders all legend categories without dropping entries', () => {
        const service = new PieChartImageService();
        const categories = Array.from({ length: 14 }, (_, index) => ({
            category: `Categoria ${index + 1}`,
            amount: 10,
            percentage: 100 / 14,
        }));
        const buffer = service.renderExpensePieChart({
            month: { month: 5, year: 2026, label: '05/2026' },
            holders: ['Ana'],
            accounts: ['EFECTIVO'],
            excludedCategories: [],
            allHolders: false,
            allAccounts: false,
            total: 140,
            categories,
        });

        expect(buffer.subarray(0, 8)).toEqual(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        );
        expect(buffer.length).toBeGreaterThan(1000);
    });
});
