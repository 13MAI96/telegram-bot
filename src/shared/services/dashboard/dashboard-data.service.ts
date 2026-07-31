import { Injectable } from '@nestjs/common';
import { TransactionMovement } from 'src/sheets/transaction-movement.model';
import {
    DashboardFilters,
    DashboardMonth,
    ExpenseCategoryDashboard,
    ExpenseCategoryTotal,
    SelectionParseResult,
} from 'src/shared/types/dashboard.types';

@Injectable()
export class DashboardDataService {
    private readonly monthNames = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
    ];

    parseMonth(
        input: string | undefined,
        baseDate = new Date(),
    ): DashboardMonth | null {
        if (!input) {
            return null;
        }

        const normalized = this.normalizeText(input);
        if (normalized === 'este_mes') {
            return this.buildMonth(
                baseDate.getMonth() + 1,
                baseDate.getFullYear(),
            );
        }

        if (normalized === 'mes_pasado') {
            const previousMonth = new Date(
                baseDate.getFullYear(),
                baseDate.getMonth() - 1,
                1,
            );
            return this.buildMonth(
                previousMonth.getMonth() + 1,
                previousMonth.getFullYear(),
            );
        }

        const numericMatch = normalized.match(/^(\d{1,2})\/(\d{4})$/);
        if (numericMatch) {
            return this.buildMonth(
                Number(numericMatch[1]),
                Number(numericMatch[2]),
            );
        }

        const namedMonthIndex = this.monthNames.indexOf(normalized);
        if (namedMonthIndex > -1) {
            return this.buildMonth(namedMonthIndex + 1, baseDate.getFullYear());
        }

        return null;
    }

    parseSelection(
        input: string | undefined,
        options: string[],
    ): SelectionParseResult {
        if (!input) {
            return { invalidValues: [''] };
        }

        const normalized = this.normalizeText(input);
        if (normalized === 'todos') {
            return { values: [...options], all: true };
        }

        const requestedValues = input
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0);

        if (requestedValues.length === 0) {
            return { invalidValues: [input] };
        }

        const values: string[] = [];
        const invalidValues: string[] = [];
        requestedValues.forEach((value) => {
            const match = options.find(
                (option) =>
                    this.normalizeText(option) === this.normalizeText(value),
            );
            if (match) {
                values.push(match);
            } else {
                invalidValues.push(value);
            }
        });

        if (invalidValues.length > 0) {
            return { invalidValues };
        }

        return { values: [...new Set(values)], all: false };
    }

    aggregateExpenseCategories(
        movements: TransactionMovement[],
        month: DashboardMonth,
        filters: DashboardFilters,
    ): ExpenseCategoryDashboard {
        const totalsByCategory = movements
            .filter((movement) => this.matchesMonth(movement.date, month))
            .filter((movement) => filters.holders.includes(movement.holder))
            .filter((movement) => filters.accounts.includes(movement.account))
            .filter((movement) => movement.debit > 0)
            .reduce((totals, movement) => {
                const current = totals.get(movement.category) ?? 0;
                totals.set(
                    movement.category,
                    Math.round((current + movement.debit) * 100) / 100,
                );
                return totals;
            }, new Map<string, number>());

        const total = [...totalsByCategory.values()].reduce(
            (sum, amount) => Math.round((sum + amount) * 100) / 100,
            0,
        );

        const categories: ExpenseCategoryTotal[] = [
            ...totalsByCategory.entries(),
        ]
            .map(([category, amount]) => ({
                category,
                amount,
                percentage:
                    total === 0
                        ? 0
                        : Math.round((amount / total) * 10000) / 100,
            }))
            .sort((a, b) => b.amount - a.amount);

        return {
            month,
            holders: filters.holders,
            accounts: filters.accounts,
            allHolders: filters.allHolders,
            allAccounts: filters.allAccounts,
            categories,
            total,
        };
    }

    formatFallback(dashboard: ExpenseCategoryDashboard): string {
        const filters = this.formatFilters(dashboard);
        const rows = dashboard.categories
            .map(
                (entry) =>
                    `${entry.category}: ${this.formatAmount(entry.amount)} (${entry.percentage.toFixed(2)}%)`,
            )
            .join('\n');

        return [
            `Gastos por categoría - ${dashboard.month.label}`,
            filters,
            `Total: ${this.formatAmount(dashboard.total)}`,
            rows,
        ]
            .filter(Boolean)
            .join('\n');
    }

    formatCaption(dashboard: ExpenseCategoryDashboard): string {
        return [
            `Gastos por categoría - ${dashboard.month.label}`,
            this.formatFilters(dashboard),
            `Total: ${this.formatAmount(dashboard.total)}`,
        ].join('\n');
    }

    formatAmount(value: number): string {
        return value.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    private matchesMonth(dateValue: string, month: DashboardMonth): boolean {
        const match = dateValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) {
            return false;
        }

        return (
            Number(match[2]) === month.month && Number(match[3]) === month.year
        );
    }

    private buildMonth(month: number, year: number): DashboardMonth | null {
        if (month < 1 || month > 12 || year < 1900) {
            return null;
        }

        return {
            month,
            year,
            label: `${String(month).padStart(2, '0')}/${year}`,
        };
    }

    private formatFilters(dashboard: ExpenseCategoryDashboard): string {
        const holders = dashboard.allHolders
            ? 'Titulares: todos'
            : `Titulares: ${dashboard.holders.join(', ')}`;
        const accounts = dashboard.allAccounts
            ? 'Cuentas: todas'
            : `Cuentas: ${dashboard.accounts.join(', ')}`;

        return `${holders} | ${accounts}`;
    }

    private normalizeText(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }
}
