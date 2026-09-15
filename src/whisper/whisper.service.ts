import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WhisperService {
    private readonly logger = new Logger(WhisperService.name);

    constructor() {}

    public async requestTranscription(file) {
        const formData = new FormData();

        formData.append('file', file); // File, Blob, etc.
        formData.append('model', 'Systran/faster-whisper-large-v3');
        formData.append('language', 'es');
        formData.append('response_format', 'json');

        const response = await fetch(
            'http://whisper.marceloiglesias.net.ar/v1/audio/transcriptions',
            {
                method: 'POST',
                body: formData,
            },
        );

        const data = await response.json();

        this.logger.log(data.text);
        return JSON.stringify(data.text);
    }
}
