import { Inject, Injectable } from '@nestjs/common';
import { RsvpEntry } from '../../domain/entities/rsvp-entry.entity';
import {
  RsvpRepository,
  RSVP_REPOSITORY,
} from '../../domain/repositories/rsvp.repository';
import { TelegramNotifierService } from '../../infrastructure/notifications/telegram-notifier.service';

export interface ConfirmAttendanceInput {
  fullName: string;
  phone?: string;
  attending: boolean;
  guestsCount?: number;
  plusOne?: boolean;
  partnerName?: string;
  withChildren?: boolean;
  childrenDetails?: string;
  drinks?: string[];
  allergyDetails?: string;
  message?: string;
}

@Injectable()
export class RsvpService {
  constructor(
    @Inject(RSVP_REPOSITORY)
    private readonly repository: RsvpRepository,
    private readonly notifier: TelegramNotifierService,
  ) {}

  async confirm(input: ConfirmAttendanceInput): Promise<RsvpEntry> {
    const entry = RsvpEntry.create({
      fullName: input.fullName,
      phone: input.phone ?? null,
      attending: input.attending,
      guestsCount: input.guestsCount ?? null,
      plusOne: input.plusOne ?? null,
      partnerName: input.partnerName ?? null,
      withChildren: input.withChildren ?? null,
      childrenDetails: input.childrenDetails ?? null,
      drinks: input.drinks?.length ? input.drinks : null,
      allergyDetails: input.allergyDetails ?? null,
      message: input.message ?? null,
      createdAt: new Date(),
    });

    const saved = await this.repository.create(entry);
    await this.notifier.sendRsvp(saved);
    return saved;
  }

  async list(): Promise<RsvpEntry[]> {
    return this.repository.findAll();
  }
}
