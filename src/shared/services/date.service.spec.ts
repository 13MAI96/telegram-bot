import { DateService } from './date.service';

describe('DateService', () => {
    const service = new DateService();

    it('resolves sig <dia> to the next month with day clamping', () => {
        const resolved = service.resolveDateInput(
            'sig 31',
            new Date(2026, 4, 12, 12),
        );

        expect(resolved).toBe('30/06/2026');
    });

    it('resolves ayer relative to the provided base date', () => {
        const resolved = service.resolveDateInput(
            'ayer',
            new Date(2026, 4, 12, 12),
        );

        expect(resolved).toBe('11/05/2026');
    });
});
