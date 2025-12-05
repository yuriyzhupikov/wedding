import { Module } from '@nestjs/common';
import { RsvpService } from '../application/rsvp/rsvp.service';
import { RSVP_REPOSITORY } from '../domain/repositories/rsvp.repository';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { MongoRsvpRepository } from '../infrastructure/repositories/mongo-rsvp.repository';
import { RsvpController } from '../interfaces/http/rsvp.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RsvpController],
  providers: [
    RsvpService,
    {
      provide: RSVP_REPOSITORY,
      useClass: MongoRsvpRepository,
    },
  ],
})
export class RsvpModule {}
