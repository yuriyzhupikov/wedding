import { Inject, Injectable } from '@nestjs/common';
import { RsvpEntry } from '../../domain/entities/rsvp-entry.entity';
import {
  RsvpRepository,
  RSVP_REPOSITORY,
} from '../../domain/repositories/rsvp.repository';

export interface ConfirmAttendanceInput {
  fullName: string;
  phone?: string;
  attending: boolean;
  guestsCount?: number;
  message?: string;
}

@Injectable()
export class RsvpService {
  constructor(
    @Inject(RSVP_REPOSITORY)
    private readonly repository: RsvpRepository,
  ) {}

  async confirm(input: ConfirmAttendanceInput): Promise<RsvpEntry> {
    const entry = RsvpEntry.create({
      fullName: input.fullName,
      phone: input.phone ?? null,
      attending: input.attending,
      guestsCount: input.guestsCount ?? null,
      message: input.message ?? null,
      createdAt: new Date(),
    });

    return this.repository.create(entry);
  }

  async list(): Promise<RsvpEntry[]> {
    return this.repository.findAll();
  }
}
