import { Injectable, Logger } from '@nestjs/common';

const ACTIVE_WINDOW_MS = 60 * 60 * 1000;

@Injectable()
export class KoyebWakeActivityService {
    private readonly logger = new Logger(KoyebWakeActivityService.name);
    private readonly recentTelegramUsers = new Map<string, number>();

    recordTelegramActivity(userId: string | number, at = Date.now()) {
        this.recentTelegramUsers.set(String(userId), at);
        this.pruneTelegramUsers(at);
        this.logger.debug(
            `Recorded Telegram activity for user=${userId}; trackedUsers=${this.recentTelegramUsers.size}`,
        );
    }

    getRecentlyActiveUsers(at = Date.now()): string[] {
        this.pruneTelegramUsers(at);
        return [...this.recentTelegramUsers.keys()];
    }

    private pruneTelegramUsers(at = Date.now()) {
        for (const [userId, lastActivityAt] of this.recentTelegramUsers) {
            if (at - lastActivityAt > ACTIVE_WINDOW_MS) {
                this.recentTelegramUsers.delete(userId);
            }
        }
    }
}
