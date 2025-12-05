import { Injectable, Logger } from '@nestjs/common';
import { Agent, fetch } from 'undici';
import { RsvpEntry } from '../../domain/entities/rsvp-entry.entity';

@Injectable()
export class TelegramNotifierService {
  private readonly logger = new Logger(TelegramNotifierService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly chatId = process.env.TELEGRAM_CHAT_ID;
  private readonly apiUrl = this.botToken
    ? `https://api.telegram.org/bot${this.botToken}/sendMessage`
    : null;
  private readonly agent = new Agent({ connect: { family: 4, timeout: 10_000 } });

  async sendRsvp(entry: RsvpEntry): Promise<void> {
    if (!this.apiUrl || !this.chatId) {
      return;
    }

    const lines = [
      '💌 Новая заявка на участие',
      `Имя: ${entry.fullName}`,
      `Статус: ${entry.attending ? 'Придет' : 'Не сможет'}`,
    ];

    if (entry.guestsCount) {
      lines.push(`Гостей: ${entry.guestsCount}`);
    }

    if (entry.phone) {
      lines.push(`Телефон: ${entry.phone}`);
    }

    if (entry.message) {
      lines.push(`Комментарий: ${entry.message}`);
    }

    lines.push(
      `Время: ${entry.createdAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
    );

    const payload = {
      chat_id: this.chatId,
      text: lines.join('\n'),
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      dispatcher: this.agent,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const snippet = (await response.text()).slice(0, 200) || '<no body>';
      this.logger.warn(
        `Failed to send Telegram notification: status=${response.status}, body=${snippet}`,
      );
    }
  }
}
