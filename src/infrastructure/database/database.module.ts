import { Global, Module } from '@nestjs/common';
import { MongoClientProvider } from './mongo-client.provider';

@Global()
@Module({
  providers: [MongoClientProvider],
  exports: [MongoClientProvider],
})
export class DatabaseModule {}
