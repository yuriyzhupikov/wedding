import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { RsvpEntry } from '../../domain/entities/rsvp-entry.entity';
import { RsvpRepository } from '../../domain/repositories/rsvp.repository';
import { MongoClientProvider } from '../database/mongo-client.provider';

interface RsvpDocument {
  _id?: ObjectId;
  fullName: string;
  phone?: string | null;
  attending: boolean;
  guestsCount?: number | null;
  message?: string | null;
  createdAt: Date;
}

@Injectable()
export class MongoRsvpRepository implements RsvpRepository {
  constructor(private readonly mongo: MongoClientProvider) {}

  private async getCollection() {
    return this.mongo.collection<RsvpDocument>('rsvps');
  }

  async create(entry: RsvpEntry): Promise<RsvpEntry> {
    const collection = await this.getCollection();
    const document: RsvpDocument = {
      fullName: entry.fullName,
      phone: entry.phone,
      attending: entry.attending,
      guestsCount: entry.guestsCount,
      message: entry.message,
      createdAt: entry.createdAt,
    };
    const result = await collection.insertOne(document);
    return entry.withId(result.insertedId.toHexString());
  }

  async findAll(): Promise<RsvpEntry[]> {
    const collection = await this.getCollection();
    const documents = await collection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    return documents.map((doc) =>
      RsvpEntry.rehydrate({
        id: doc._id?.toHexString() ?? null,
        fullName: doc.fullName,
        phone: doc.phone ?? null,
        attending: doc.attending,
        guestsCount: doc.guestsCount ?? null,
        message: doc.message ?? null,
        createdAt: doc.createdAt,
      }),
    );
  }
}
