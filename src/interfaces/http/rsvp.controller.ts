import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
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
      plusOne: dto.plusOne,
      secondDay: dto.secondDay,
      partnerName: dto.partnerName,
      withChildren: dto.withChildren,
      childrenDetails: dto.childrenDetails,
      drinks: dto.drinks,
      allergyDetails: dto.allergyDetails,
      message: dto.message,
    });

    return this.present(entry);
  }

  @Get('export.xlsx')
  async exportXlsx(
    @Res() response: Response,
    @Query('token') token?: string,
    @Headers('x-rsvp-export-token') headerToken?: string,
    @Headers('authorization') authorization?: string,
  ) {
    this.assertExportAccess(token, headerToken, authorization);

    const file = await this.service.exportXlsx();
    const fileName = `rsvp-export-${this.currentDateStamp()}.xlsx`;

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );
    response.setHeader('Content-Length', file.length);
    response.send(file);
  }

  @Get()
  async list(
    @Query('token') token?: string,
    @Headers('x-rsvp-export-token') headerToken?: string,
    @Headers('authorization') authorization?: string,
  ) {
    this.assertExportAccess(token, headerToken, authorization);

    const entries = await this.service.list();
    return entries.map((entry) => this.present(entry));
  }

  private currentDateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private assertExportAccess(
    queryToken?: string,
    headerToken?: string,
    authorization?: string,
  ): void {
    const expectedToken = process.env.RSVP_EXPORT_TOKEN?.trim();

    if (!expectedToken) {
      throw new ServiceUnavailableException('Выгрузка заявок не настроена.');
    }

    const tokens = [
      queryToken,
      headerToken,
      this.parseBearerToken(authorization),
    ].filter((value): value is string => Boolean(value?.trim()));

    if (!tokens.some((value) => value.trim() === expectedToken)) {
      throw new UnauthorizedException('Нет доступа к выгрузке заявок.');
    }
  }

  private parseBearerToken(value?: string): string | undefined {
    const trimmed = value?.trim();

    if (!trimmed) {
      return undefined;
    }

    const match = trimmed.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim();
  }

  private present(entry: RsvpEntry) {
    return {
      id: entry.id,
      fullName: entry.fullName,
      attending: entry.attending,
      phone: entry.phone,
      guestsCount: entry.guestsCount,
      plusOne: entry.plusOne,
      secondDay: entry.secondDay,
      partnerName: entry.partnerName,
      withChildren: entry.withChildren,
      childrenDetails: entry.childrenDetails,
      drinks: entry.drinks,
      allergyDetails: entry.allergyDetails,
      message: entry.message,
      createdAt: entry.createdAt,
    };
  }
}
