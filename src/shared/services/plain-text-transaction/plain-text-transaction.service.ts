import { Injectable } from '@nestjs/common';
import { Group } from 'src/schemas/group.schema';
import { DateService } from 'src/shared/services/date/date.service';
import { NumberService } from 'src/shared/services/number/number.service';
import {
    PlainTextTransactionParseResult,
    PlainTextTransactionPayload,
} from 'src/shared/types/plain-text-transaction.types';

@Injectable()
export class PlainTextTransactionService {
    constructor(
        private dateService: DateService,
        private numberService: NumberService,
    ) {}

    parse(
        message: string | undefined,
        group: Group,
    ): PlainTextTransactionParseResult {
        if (!message) {
            return { error: 'El mensaje está vacío.' };
        }

        const fields = message.split(',').map((value) => value.trim());
        if (fields.length !== 6 || fields.some((value) => value.length === 0)) {
            return {
                error: 'El formato no coincide con los 6 campos pedidos.',
            };
        }

        const [
            dateInput,
            categoryInput,
            description,
            amountInput,
            accountInput,
            holderInput,
        ] = fields;
        const date = this.resolvePlainDate(dateInput);
        if (!date) {
            return { error: 'La fecha es inválida.' };
        }

        const category = this.findCanonical(categoryInput, group.categories);
        if (!category) {
            return { error: 'La categoría no existe.' };
        }

        if (!this.isNumericAmount(amountInput)) {
            return { error: 'El monto debe ser numérico.' };
        }

        const amount = this.numberService.toNumber(amountInput);
        if (amount < 0) {
            return { error: 'El monto debe ser mayor o igual a 0.' };
        }

        const account = this.findCanonical(accountInput, group.accounts);
        if (!account) {
            return { error: 'La cuenta no existe.' };
        }

        const holder = this.findCanonical(holderInput, group.holders);
        if (!holder) {
            return { error: 'El titular no existe.' };
        }

        const payload: PlainTextTransactionPayload = {
            date,
            category,
            description,
            amount,
            account,
            holder,
        };

        return { payload };
    }

    private resolvePlainDate(value: string): string | null {
        const normalized = value.trim().toLowerCase();
        if (normalized !== 'hoy' && normalized !== 'ayer') {
            return this.dateService.isValidDate(value) ? value.trim() : null;
        }

        return this.dateService.resolveDateInput(value);
    }

    private findCanonical(
        value: string,
        options: string[] | undefined,
    ): string | undefined {
        return options?.find(
            (option) => option.toLowerCase() === value.toLowerCase(),
        );
    }

    private isNumericAmount(value: string): boolean {
        return /^-?\d+(\.\d+)?$/.test(value.trim());
    }
}
