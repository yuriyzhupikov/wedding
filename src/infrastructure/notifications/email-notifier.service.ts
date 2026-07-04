import { Injectable, Logger } from '@nestjs/common';
import { createConnection, Socket } from 'node:net';
import { connect as connectTls } from 'node:tls';
import { RsvpEntry } from '../../domain/entities/rsvp-entry.entity';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  startTls: boolean;
  username?: string;
  password?: string;
  from: string;
  recipients: string[];
  timeoutMs: number;
}

interface SmtpReply {
  code: number;
  lines: string[];
}

@Injectable()
export class EmailNotifierService {
  private readonly logger = new Logger(EmailNotifierService.name);
  private readonly config = this.readConfig();

  async sendRsvp(entry: RsvpEntry): Promise<void> {
    if (!this.config) {
      return;
    }

    try {
      await this.sendMail(this.config, this.buildMessage(entry, this.config));
    } catch (error) {
      this.logger.warn(
        `Failed to send email notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private readConfig(): SmtpConfig | null {
    const host = this.envValue('SMTP_HOST');
    const recipients = this.parseList(
      process.env.RSVP_NOTIFICATION_EMAIL ?? process.env.SMTP_TO,
    );
    const username = this.envValue('SMTP_USER');
    const password =
      this.envValue('SMTP_PASS') ?? this.envValue('SMTP_PASSWORD');
    const from =
      this.envValue('SMTP_FROM') ?? this.envValue('MAIL_FROM') ?? username;

    if (!host || !from || recipients.length === 0) {
      return null;
    }

    const configuredPort = this.parsePort(process.env.SMTP_PORT);
    const configuredSecure = this.parseBoolean(process.env.SMTP_SECURE);
    const secure = configuredSecure ?? configuredPort === 465;
    const port = configuredPort ?? (secure ? 465 : 587);
    const startTls = this.parseBoolean(process.env.SMTP_STARTTLS) ?? !secure;
    const timeoutMs = this.parsePort(process.env.SMTP_TIMEOUT_MS) ?? 10_000;

    return {
      host,
      port,
      secure,
      startTls,
      username,
      password,
      from,
      recipients,
      timeoutMs,
    };
  }

  private async sendMail(config: SmtpConfig, message: string): Promise<void> {
    const connection = await SmtpConnection.connect(config);

    try {
      this.expect(await connection.readReply(), [220], 'SMTP greeting');

      let ehloReply = await connection.command(`EHLO ${this.localName()}`);
      this.expect(ehloReply, [250], 'EHLO');

      if (!config.secure && config.startTls) {
        if (!this.supportsStartTls(ehloReply)) {
          throw new Error('SMTP server does not advertise STARTTLS');
        }

        this.expect(await connection.command('STARTTLS'), [220], 'STARTTLS');
        await connection.upgradeToTls(config.host);
        ehloReply = await connection.command(`EHLO ${this.localName()}`);
        this.expect(ehloReply, [250], 'EHLO after STARTTLS');
      }

      await this.authenticateIfNeeded(connection, ehloReply, config);

      const from = this.envelopeAddress(config.from);
      this.expect(
        await connection.command(`MAIL FROM:<${from}>`),
        [250],
        'MAIL FROM',
      );

      for (const recipient of config.recipients) {
        this.expect(
          await connection.command(
            `RCPT TO:<${this.envelopeAddress(recipient)}>`,
          ),
          [250, 251],
          'RCPT TO',
        );
      }

      this.expect(await connection.command('DATA'), [354], 'DATA');
      this.expect(await connection.sendData(message), [250], 'message body');

      try {
        await connection.command('QUIT');
      } catch {
        // The message is already accepted; ignore disconnects during QUIT.
      }
    } finally {
      connection.close();
    }
  }

  private async authenticateIfNeeded(
    connection: SmtpConnection,
    ehloReply: SmtpReply,
    config: SmtpConfig,
  ): Promise<void> {
    if (!config.username || !config.password) {
      return;
    }

    const mechanisms = this.authMechanisms(ehloReply);

    if (mechanisms.includes('PLAIN')) {
      const token = Buffer.from(
        `\0${config.username}\0${config.password}`,
        'utf8',
      ).toString('base64');
      this.expect(
        await connection.command(`AUTH PLAIN ${token}`),
        [235],
        'AUTH',
      );
      return;
    }

    if (mechanisms.includes('LOGIN')) {
      this.expect(await connection.command('AUTH LOGIN'), [334], 'AUTH LOGIN');
      this.expect(
        await connection.command(
          Buffer.from(config.username, 'utf8').toString('base64'),
        ),
        [334],
        'AUTH username',
      );
      this.expect(
        await connection.command(
          Buffer.from(config.password, 'utf8').toString('base64'),
        ),
        [235],
        'AUTH password',
      );
      return;
    }

    throw new Error('SMTP server does not advertise supported AUTH mechanisms');
  }

  private buildMessage(entry: RsvpEntry, config: SmtpConfig): string {
    const body = this.buildBody(entry);
    const subject = 'Новая заявка на участие';
    const headers = [
      `From: ${this.headerValue(config.from)}`,
      `To: ${config.recipients.map((email) => this.headerValue(email)).join(', ')}`,
      `Subject: ${this.encodeHeader(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      `Date: ${new Date().toUTCString()}`,
    ];

    return `${headers.join('\r\n')}\r\n\r\n${this.wrapBase64(body)}`;
  }

  private buildBody(entry: RsvpEntry): string {
    const lines = [
      'Новая заявка на участие',
      `Имя: ${entry.fullName}`,
      `Статус: ${entry.attending ? 'Придет' : 'Не сможет'}`,
    ];

    if (entry.guestsCount) {
      lines.push(`Гостей: ${entry.guestsCount}`);
    }

    if (entry.plusOne !== null) {
      lines.push(`С парой: ${entry.plusOne ? 'Да' : 'Нет'}`);
    }

    if (entry.secondDay !== null) {
      lines.push(`Будет на втором дне: ${entry.secondDay ? 'Да' : 'Нет'}`);
    }

    if (entry.partnerName) {
      lines.push(`Фамилия партнера: ${entry.partnerName}`);
    }

    if (entry.withChildren !== null) {
      lines.push(`С детьми: ${entry.withChildren ? 'Да' : 'Нет'}`);
    }

    if (entry.childrenDetails) {
      lines.push(`Дети: ${entry.childrenDetails}`);
    }

    if (entry.drinks?.length) {
      lines.push(`Напитки: ${entry.drinks.join(', ')}`);
    }

    if (entry.allergyDetails) {
      lines.push(`Аллергия: ${entry.allergyDetails}`);
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

    return lines.join('\n');
  }

  private parseList(value?: string): string[] {
    return (value ?? '')
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private envValue(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
  }

  private parsePort(value?: string): number | undefined {
    const port = Number(value);
    return Number.isInteger(port) && port > 0 ? port : undefined;
  }

  private parseBoolean(value?: string): boolean | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }

    return undefined;
  }

  private supportsStartTls(reply: SmtpReply): boolean {
    return reply.lines.some((line) => line.toUpperCase().includes('STARTTLS'));
  }

  private authMechanisms(reply: SmtpReply): string[] {
    return reply.lines
      .map((line) => line.slice(4).trim())
      .filter((line) => line.toUpperCase().startsWith('AUTH'))
      .map((line) => line.replace(/^AUTH=/i, 'AUTH '))
      .flatMap((line) => line.split(/\s+/).slice(1))
      .map((mechanism) => mechanism.toUpperCase());
  }

  private expect(reply: SmtpReply, codes: number[], context: string): void {
    if (!codes.includes(reply.code)) {
      throw new Error(
        `${context} failed: code=${reply.code}, response=${reply.lines.join(' | ')}`,
      );
    }
  }

  private encodeHeader(value: string): string {
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
  }

  private headerValue(value: string): string {
    return value.replace(/[\r\n]+/g, ' ').trim();
  }

  private envelopeAddress(value: string): string {
    const match = value.match(/<([^>]+)>/);
    return (match?.[1] ?? value).replace(/[<>\r\n]/g, '').trim();
  }

  private wrapBase64(value: string): string {
    return (
      Buffer.from(value, 'utf8')
        .toString('base64')
        .match(/.{1,76}/g)
        ?.join('\r\n') ?? ''
    );
  }

  private localName(): string {
    return process.env.SMTP_EHLO_NAME?.trim() || 'wedding-site.local';
  }
}

class SmtpConnection {
  private buffer = '';
  private pending: {
    resolve: (reply: SmtpReply) => void;
    reject: (error: Error) => void;
  } | null = null;

  private constructor(
    private socket: Socket,
    private readonly timeoutMs: number,
  ) {
    this.bindSocket(socket);
  }

  static async connect(config: SmtpConfig): Promise<SmtpConnection> {
    const socket = config.secure
      ? await this.connectTlsSocket(config)
      : await this.connectPlainSocket(config);

    return new SmtpConnection(socket, config.timeoutMs);
  }

  readReply(): Promise<SmtpReply> {
    const reply = this.tryExtractReply();

    if (reply) {
      return Promise.resolve(reply);
    }

    if (this.pending) {
      return Promise.reject(new Error('SMTP reply is already pending'));
    }

    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
    });
  }

  async command(command: string): Promise<SmtpReply> {
    await this.write(`${command}\r\n`);
    return this.readReply();
  }

  async sendData(message: string): Promise<SmtpReply> {
    const data = `${message
      .replace(/\r?\n/g, '\r\n')
      .replace(/^\./gm, '..')}\r\n.\r\n`;
    await this.write(data);
    return this.readReply();
  }

  async upgradeToTls(host: string): Promise<void> {
    const plainSocket = this.socket;
    this.unbindSocket(plainSocket);
    this.buffer = '';

    const tlsSocket = connectTls({
      socket: plainSocket,
      servername: host,
    });

    await new Promise<void>((resolve, reject) => {
      const cleanup = (): void => {
        tlsSocket.off('secureConnect', onSecureConnect);
        tlsSocket.off('error', onError);
      };
      const onSecureConnect = (): void => {
        cleanup();
        resolve();
      };
      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };

      tlsSocket.once('secureConnect', onSecureConnect);
      tlsSocket.once('error', onError);
    });

    this.bindSocket(tlsSocket);
  }

  close(): void {
    this.socket.end();
    this.socket.destroy();
  }

  private bindSocket(socket: Socket): void {
    this.socket = socket;
    this.socket.setTimeout(this.timeoutMs);
    this.socket.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf8');
      this.resolvePendingReply();
    });
    this.socket.on('error', (error: Error) => this.rejectPending(error));
    this.socket.on('close', () => {
      this.rejectPending(new Error('SMTP connection closed'));
    });
    this.socket.on('timeout', () => {
      const error = new Error('SMTP connection timed out');
      this.rejectPending(error);
      this.socket.destroy(error);
    });
  }

  private unbindSocket(socket: Socket): void {
    socket.removeAllListeners('data');
    socket.removeAllListeners('error');
    socket.removeAllListeners('close');
    socket.removeAllListeners('timeout');
  }

  private async write(data: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.socket.write(data, 'utf8', (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private resolvePendingReply(): void {
    if (!this.pending) {
      return;
    }

    const reply = this.tryExtractReply();

    if (!reply) {
      return;
    }

    const pending = this.pending;
    this.pending = null;
    pending.resolve(reply);
  }

  private rejectPending(error: Error): void {
    if (!this.pending) {
      return;
    }

    const pending = this.pending;
    this.pending = null;
    pending.reject(error);
  }

  private tryExtractReply(): SmtpReply | null {
    const lines: string[] = [];
    let offset = 0;

    while (true) {
      const lineEnd = this.buffer.indexOf('\r\n', offset);

      if (lineEnd === -1) {
        return null;
      }

      const line = this.buffer.slice(offset, lineEnd);
      lines.push(line);
      offset = lineEnd + 2;

      if (/^\d{3} /.test(line)) {
        this.buffer = this.buffer.slice(offset);
        return {
          code: Number(line.slice(0, 3)),
          lines,
        };
      }
    }
  }

  private static async connectPlainSocket(config: SmtpConfig): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({
        host: config.host,
        port: config.port,
      });
      const cleanup = (): void => {
        socket.off('connect', onConnect);
        socket.off('error', onError);
        socket.off('timeout', onTimeout);
      };
      const onConnect = (): void => {
        cleanup();
        resolve(socket);
      };
      const onError = (error: Error): void => {
        cleanup();
        socket.destroy();
        reject(error);
      };
      const onTimeout = (): void => {
        onError(new Error('SMTP connection timed out'));
      };

      socket.setTimeout(config.timeoutMs);
      socket.once('connect', onConnect);
      socket.once('error', onError);
      socket.once('timeout', onTimeout);
    });
  }

  private static async connectTlsSocket(config: SmtpConfig): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = connectTls({
        host: config.host,
        port: config.port,
        servername: config.host,
      });
      const cleanup = (): void => {
        socket.off('secureConnect', onSecureConnect);
        socket.off('error', onError);
        socket.off('timeout', onTimeout);
      };
      const onSecureConnect = (): void => {
        cleanup();
        resolve(socket);
      };
      const onError = (error: Error): void => {
        cleanup();
        socket.destroy();
        reject(error);
      };
      const onTimeout = (): void => {
        onError(new Error('SMTP connection timed out'));
      };

      socket.setTimeout(config.timeoutMs);
      socket.once('secureConnect', onSecureConnect);
      socket.once('error', onError);
      socket.once('timeout', onTimeout);
    });
  }
}
