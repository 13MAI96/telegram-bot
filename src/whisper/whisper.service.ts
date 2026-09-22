import { Injectable, Logger } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';
import { Agent, fetch, RequestInit, FormData } from 'undici';

@Injectable()
export class WhisperService {
    private readonly logger = new Logger(WhisperService.name);
    private whisperApi = process.env.WHISPER_HOST!;
    public readonly alerts = new BehaviorSubject<{
        chatId: number;
        message: string;
    } | null>(null);
    public readonly resultDocument = new BehaviorSubject<{
        chatId: number;
        document: { source: Buffer; filename: string };
    } | null>(null);

    private agent = new Agent({
        headersTimeout: 100 * 60 * 1000,
        bodyTimeout: 100 * 60 * 1000,
    });

    constructor() {}

    public async requestTranscription(file, chatId) {
        const formData = new FormData();

        formData.append(
            'file',
            new Blob([file], { type: 'audio/ogg' }),
            'audio.ogg',
        ); // File, Blob, etc.
        formData.append('model', 'Systran/faster-whisper-medium');
        formData.append('language', 'es');
        formData.append('response_format', 'json');
        formData.append('temperature', 0);
        formData.append('vad_filter', true);
        formData.append('condition_on_previous_text', false);

        const time = Date.now();
        const response = fetch(`${this.whisperApi}/v1/audio/transcriptions`, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(100 * 60 * 1000),
            dispatcher: this.agent,
        } as RequestInit)
            .then((res) => res.json())
            .then((result: unknown) => {
                this.alerts.next({
                    chatId,
                    message: `Ya esta tu transcipcion. \nWhisper tardo aprox: ${((Date.now() - time) / 1000 / 60).toPrecision(2)}m`,
                });
                const text = (result as { text: string }).text;
                if (text && text.length > 500) {
                    const buffer = Buffer.from(text, 'utf8');
                    this.resultDocument.next({
                        chatId,
                        document: {
                            source: buffer,
                            filename: 'archivo.txt',
                        },
                    });
                } else if (text.length < 500) {
                    this.alerts.next({ chatId, message: text });
                }
            });

        return true;
    }
}
