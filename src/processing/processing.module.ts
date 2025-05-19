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
      name: process.env.FILE_PROCESSING_QUEUE_NAME || 'file-processing-queue',
      useFactory: (configService: ConfigService) => ({
        name: configService.get<string>('bullmq.queueName'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [FileProducerService, FileProcessor],
  exports: [FileProducerService],
})
export class ProcessingModule {}
