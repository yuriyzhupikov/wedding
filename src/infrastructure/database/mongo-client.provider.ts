import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Collection, Document, MongoClient } from 'mongodb';

@Injectable()
export class MongoClientProvider implements OnModuleDestroy {
  private client: MongoClient | null = null;

  private async getClient(): Promise<MongoClient> {
    if (this.client) {
      return this.client;
    }

    const uri =
      process.env.MONGODB_URI ??
      'mongodb://127.0.0.1:27017/?retryWrites=true&w=majority';

    const client = new MongoClient(uri);
    await client.connect();
    this.client = client;

    return this.client;
  }

  async collection<TSchema extends Document = Document>(
    collectionName: string,
  ): Promise<Collection<TSchema>> {
    const client = await this.getClient();
    const dbName = process.env.MONGODB_DB ?? 'wedding_site';
    return client.db(dbName).collection<TSchema>(collectionName);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}
