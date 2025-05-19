import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileProducerService } from './file.producer.service';
import { FileProcessor } from './file.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: configService.get('bullmq.redis'),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      imports: [ConfigModule],
      // Name here is critical for @InjectQueue and @Processor to find the correct queue.
      // It should match what's in bullmq.config.ts or the .env variable.
      name: process.env.FILE_PROCESSING_QUEUE_NAME || 'file-processing-queue', // Fallback just in case
      useFactory: (configService: ConfigService) => ({
        name: configService.get<string>('bullmq.queueName'), // Primary way to get queue name
        // defaultJobOptions: { ... } // if needed
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [FileProducerService, FileProcessor],
  exports: [FileProducerService],
})
export class ProcessingModule {}
