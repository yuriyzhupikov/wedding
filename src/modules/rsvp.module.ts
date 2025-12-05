import { Module } from '@nestjs/common';
import { RsvpService } from '../application/rsvp/rsvp.service';
import { RSVP_REPOSITORY } from '../domain/repositories/rsvp.repository';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { TelegramNotifierService } from '../infrastructure/notifications/telegram-notifier.service';
import { MongoRsvpRepository } from '../infrastructure/repositories/mongo-rsvp.repository';
import { RsvpController } from '../interfaces/http/rsvp.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RsvpController],
  providers: [
    RsvpService,
    TelegramNotifierService,
    {
      provide: RSVP_REPOSITORY,
      useClass: MongoRsvpRepository,
    },
  ],
})
export class RsvpModule {}
