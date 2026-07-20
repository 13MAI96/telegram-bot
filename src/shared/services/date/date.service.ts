import { Injectable } from '@nestjs/common';

@Injectable()
export class DateService {
    private enum_months: string[] = [
        'ENE',
        'FEB',
        'MAR',
        'ABR',
        'MAY',
        'JUN',
        'JUL',
        'AGO',
        'SEP',
        'OCT',
        'NOV',
        'DIC',
    ];

    public isValidDate = (value: string): boolean => {
        const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) return false;

        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        if (month < 1 || month > 12) return false;

        const date = new Date(year, month - 1, day);

        return (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        );
    };

    public parseDateFromDDMMYYYY = (value: string): Date | null => {
        const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) return null;

        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JS usa 0-based months
        const year = parseInt(match[3], 10);

        const date = new Date(year, month, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    };

    public resolveDateInput = (
        value: string,
        baseDate: Date = new Date(),
    ): string | null => {
        const normalized = value.trim().toLowerCase();

        if (normalized === 'hoy') {
            return this.formatDateToDDMMYYYY(baseDate);
        }

        if (normalized === 'ayer') {
            const yesterday = new Date(baseDate);
            yesterday.setDate(yesterday.getDate() - 1);
            return this.formatDateToDDMMYYYY(yesterday);
        }

        const nextMonthShortcut = normalized.match(/^sig\s+(\d{1,2})$/i);
        if (nextMonthShortcut) {
            const requestedDay = Number(nextMonthShortcut[1]);
            if (requestedDay < 1) return null;

            const nextMonth = this.clampToDayInNextMonth(
                baseDate,
                requestedDay,
            );
            return this.formatDateToDDMMYYYY(nextMonth);
        }

        if (this.isValidDate(value)) {
            return value.trim();
        }

        return null;
    };

    public formatDateToDDMMYYYY = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    public addMonthsExactDDMMYYYY = (
        value: string,
        months: number,
    ): string | null => {
        const date = this.parseDateFromDDMMYYYY(value);
        if (!date) return null;

        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        const target = new Date(year, month + months, 1);
        const lastDay = new Date(
            target.getFullYear(),
            target.getMonth() + 1,
            0,
        ).getDate();

        target.setDate(Math.min(day, lastDay));

        return this.formatDateToDDMMYYYY(target);
    };

    public getMonthString = (date: string): string => {
        const month: number =
            this.parseDateFromDDMMYYYY(date)?.getMonth() ?? -1;
        if (month > -1 && month < 12) {
            return this.enum_months[month];
        }
        return 'INVALID';
    };

    private clampToDayInNextMonth(baseDate: Date, requestedDay: number): Date {
        const firstDayOfTargetMonth = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth() + 1,
            1,
        );
        const lastDayOfTargetMonth = new Date(
            firstDayOfTargetMonth.getFullYear(),
            firstDayOfTargetMonth.getMonth() + 1,
            0,
        ).getDate();

        return new Date(
            firstDayOfTargetMonth.getFullYear(),
            firstDayOfTargetMonth.getMonth(),
            Math.min(requestedDay, lastDayOfTargetMonth),
        );
    }
}
