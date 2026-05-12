import { Injectable } from '@nestjs/common';

@Injectable()
export class WizardMessageService {
    private readonly cancelHint = 'Podés cancelar con /cancelar.';
    private readonly supportedDateShortcuts =
        'Podés usar hoy, ayer o sig <día>.';

    buildDatePrompt(question: string): string {
        return `${question}\n${this.supportedDateShortcuts}`;
    }

    buildInvalidDateMessage(): string {
        return this.buildRetryMessage(
            'Fecha o formato inválidos.',
            'Ingresala en formato dd/mm/yyyy.',
            this.supportedDateShortcuts,
        );
    }

    buildInvalidAmountMessage(retryPrompt: string): string {
        return this.buildRetryMessage('🚫 Monto inválido.', retryPrompt);
    }

    buildRetryMessage(
        problem: string,
        retryPrompt: string,
        details?: string,
    ): string {
        return [problem, retryPrompt, details, this.cancelHint]
            .filter(Boolean)
            .join('\n');
    }

    buildPersistenceFailureMessage(): string {
        return [
            'No pude guardar la operación.',
            'Intentá nuevamente en unos minutos.',
            this.cancelHint,
        ].join('\n');
    }

    buildPartialPersistenceFailureMessage(): string {
        return [
            'No pude completar el registro.',
            'Es posible que parte de la información ya se haya guardado. Revisá la planilla antes de reintentar.',
            this.cancelHint,
        ].join('\n');
    }

    buildUnexpectedErrorMessage(): string {
        return [
            'Ocurrió un error inesperado.',
            'Intentá nuevamente.',
            this.cancelHint,
        ].join('\n');
    }

    buildSceneCancelledMessage(): string {
        return '❌ Escena cancelada.';
    }

    buildNoActiveConversationMessage(): string {
        return 'No hay una conversación activa.';
    }
}
