import { Body, Controller, Get, Post } from '@nestjs/common';
import { RsvpService } from '../../application/rsvp/rsvp.service';
import { RsvpEntry } from '../../domain/entities/rsvp-entry.entity';
import { CreateRsvpDto } from './dto/create-rsvp.dto';

@Controller('api/rsvp')
export class RsvpController {
  constructor(private readonly service: RsvpService) {}

  @Post()
  async create(@Body() dto: CreateRsvpDto) {
    const entry = await this.service.confirm({
      fullName: dto.fullName,
      attending: dto.attending,
      phone: dto.phone,
      guestsCount: dto.guestsCount,
      message: dto.message,
    });

    return this.present(entry);
  }

  @Get()
  async list() {
    const entries = await this.service.list();
    return entries.map((entry) => this.present(entry));
  }

  private present(entry: RsvpEntry) {
    return {
      id: entry.id,
      fullName: entry.fullName,
      attending: entry.attending,
      phone: entry.phone,
      guestsCount: entry.guestsCount,
      message: entry.message,
      createdAt: entry.createdAt,
    };
  }
}
