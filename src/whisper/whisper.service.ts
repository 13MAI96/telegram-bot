import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhisperService {
    private readonly logger = new Logger(WhisperService.name);

    constructor() {}

    public async requestTranscription(file) {
        const text = await fetch(
            'http://whisper.marceloiglesias.net.ar/v1/audio/transcriptions',
            {
                body: {
                    model: 'Systran/faster-whisper-large-v3',
                    file: file,
                    language: 'es',
                    response_format: 'json',
                },
            },
        );
        const result = await text.json();
        this.logger.log(result);
        return JSON.stringify(result);
    }
}
