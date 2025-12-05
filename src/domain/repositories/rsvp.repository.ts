import { RsvpEntry } from '../entities/rsvp-entry.entity';

export interface RsvpRepository {
  create(entry: RsvpEntry): Promise<RsvpEntry>;
  findAll(): Promise<RsvpEntry[]>;
}

export const RSVP_REPOSITORY = Symbol('RSVP_REPOSITORY');
