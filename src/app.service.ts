import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    constructor() {
        void this.getPublicIp();
    }

    getHello(): string {
        return 'Hello world!';
    }

    private getPublicIp = async () => {
        try {
            const req = await fetch('https://api.ipify.org?format=json');
            const res = (await req.json()) as { ip?: string };
            if (res.ip) {
                console.log(res.ip);
            }
        } catch (error) {
            console.warn(
                'Unable to fetch public IP during startup:',
                error instanceof Error ? error.message : String(error),
            );
        }
    };
}
