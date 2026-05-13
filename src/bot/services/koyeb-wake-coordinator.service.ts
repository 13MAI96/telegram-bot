import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

const ACTIVE_WINDOW_MS = 60 * 60 * 1000;
const WARNING_DELAY_MS = 59 * 60 * 1000;

@Injectable()
export class KoyebWakeCoordinatorService
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(KoyebWakeCoordinatorService.name);
    private readonly recentTelegramUsers = new Map<string, number>();
    private readonly warningCopy =
        'Me estoy por ir a dormir, si necesitás algo más no te olvides de despertarme en ';

    private warningTimer: NodeJS.Timeout | null = null;
    private currentCycleToken = 0;
    private warningSentForCycleToken: number | null = null;

    constructor(
        private readonly configService: ConfigService,
        @InjectBot() private readonly bot: Telegraf,
    ) {}

    async onModuleInit() {
        this.recordHttpActivity();
    }

    async onModuleDestroy() {
        await this.flushPendingWarning();
        this.clearWarningTimer();
    }

    recordTelegramActivity(userId: string | number, at = Date.now()) {
        this.recentTelegramUsers.set(String(userId), at);
        this.pruneTelegramUsers(at);
    }

    recordHttpActivity(at = Date.now()) {
        this.currentCycleToken += 1;
        this.warningSentForCycleToken = null;
        this.clearWarningTimer();
        this.scheduleWarning(at, this.currentCycleToken);
    }

    async flushPendingWarning() {
        if (this.warningSentForCycleToken === this.currentCycleToken) {
            return false;
        }

        return this.sendWarningForCurrentCycle();
    }

    private scheduleWarning(at: number, cycleToken: number) {
        const remaining = Math.max(WARNING_DELAY_MS, 0);
        this.warningTimer = setTimeout(() => {
            void this.sendWarningForCycle(cycleToken);
        }, remaining);

        if (remaining === 0) {
            void this.sendWarningForCycle(cycleToken);
        }

        this.logger.debug(
            `Scheduled Koyeb sleep warning for cycle=${cycleToken} at ${new Date(
                at + WARNING_DELAY_MS,
            ).toISOString()}`,
        );
    }

    private async sendWarningForCurrentCycle() {
        return this.sendWarningForCycle(this.currentCycleToken);
    }

    private async sendWarningForCycle(cycleToken: number) {
        if (cycleToken !== this.currentCycleToken) {
            return false;
        }

        if (this.warningSentForCycleToken === cycleToken) {
            return false;
        }

        const wakeLink = this.buildWakeLink();
        if (!wakeLink) {
            return false;
        }

        const activeUsers = this.getRecentlyActiveUsers();
        const warningMessage = this.buildWarningMessage(wakeLink);

        for (const userId of activeUsers) {
            const numericUserId = Number(userId);
            if (!Number.isFinite(numericUserId)) {
                this.logger.warn(
                    `Skipping Koyeb wake warning for invalid user id=${userId}`,
                );
                continue;
            }

            try {
                await this.bot.telegram.sendMessage(
                    numericUserId,
                    warningMessage,
                );
            } catch (error) {
                this.logger.error(
                    `Failed to send Koyeb wake warning to user=${userId}`,
                    error instanceof Error ? error.stack : String(error),
                );
            }
        }

        this.warningSentForCycleToken = cycleToken;
        return true;
    }

    private buildWakeLink(): string | null {
        const publicBaseUrl = this.configService
            .get<string>('PUBLIC_BASE_URL')
            ?.trim();

        if (!publicBaseUrl) {
            this.logger.warn(
                'PUBLIC_BASE_URL is not configured, skipping Koyeb wake warnings',
            );
            return null;
        }

        try {
            return new URL('/', publicBaseUrl).toString();
        } catch (error) {
            this.logger.warn(
                `PUBLIC_BASE_URL is invalid: ${error instanceof Error ? error.message : String(error)}`,
            );
            return null;
        }
    }

    private buildWarningMessage(wakeLink: string): string {
        return `${this.warningCopy}${wakeLink}`;
    }

    private getRecentlyActiveUsers(at = Date.now()): string[] {
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

    private clearWarningTimer() {
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }
}
