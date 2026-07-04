import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RsvpEntry } from '../../domain/entities/rsvp-entry.entity';
import {
  RsvpRepository,
  RSVP_REPOSITORY,
} from '../../domain/repositories/rsvp.repository';
import { EmailNotifierService } from '../../infrastructure/notifications/email-notifier.service';

export interface ConfirmAttendanceInput {
  fullName: string;
  phone?: string;
  attending: boolean;
  guestsCount?: number;
  plusOne?: boolean;
  secondDay?: boolean;
  partnerName?: string;
  withChildren?: boolean;
  childrenDetails?: string;
  drinks?: string[];
  allergyDetails?: string;
  message?: string;
}

@Injectable()
export class RsvpService {
  private readonly logger = new Logger(RsvpService.name);

  constructor(
    @Inject(RSVP_REPOSITORY)
    private readonly repository: RsvpRepository,
    private readonly notifier: EmailNotifierService,
  ) {}

  async confirm(input: ConfirmAttendanceInput): Promise<RsvpEntry> {
    const entry = RsvpEntry.create({
      fullName: input.fullName,
      phone: input.phone ?? null,
      attending: input.attending,
      guestsCount: input.guestsCount ?? null,
      plusOne: input.plusOne ?? null,
      secondDay: input.secondDay ?? null,
      partnerName: input.partnerName ?? null,
      withChildren: input.withChildren ?? null,
      childrenDetails: input.childrenDetails ?? null,
      drinks: input.drinks?.length ? input.drinks : null,
      allergyDetails: input.allergyDetails ?? null,
      message: input.message ?? null,
      createdAt: new Date(),
    });

    let saved: RsvpEntry;
    try {
      saved = await this.repository.create(entry);
    } catch (error) {
      this.logger.error(
        `Failed to save RSVP entry: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Не получилось сохранить ответ. Повторите ещё раз.',
      );
    }

    try {
      await this.notifier.sendRsvp(saved);
    } catch (error) {
      this.logger.warn(
        `Failed to send RSVP notification after save: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return saved;
  }

  async list(): Promise<RsvpEntry[]> {
    return this.repository.findAll();
  }
}
