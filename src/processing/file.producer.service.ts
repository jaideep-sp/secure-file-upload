import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export interface FileJobData {
  fileId: number;
}

@Injectable()
export class FileProducerService {
  private readonly logger = new Logger(FileProducerService.name);
  private readonly queueName: string;
  private readonly jobName: string;

  constructor(
    @InjectQueue(
      process.env.FILE_PROCESSING_QUEUE_NAME || 'file-processing-queue',
    )
    private fileQueue: Queue<FileJobData>,
    private readonly configService: ConfigService,
  ) {
    this.queueName = this.configService.get<string>('bullmq.queueName');
    this.jobName = this.configService.get<string>('bullmq.jobName');

    if (this.fileQueue.name !== this.queueName) {
      this.logger.warn(
        `Mismatch between injected queue name ('${this.fileQueue.name}') and configured queue name ('${this.queueName}').
         Ensure consistency.`,
      );
    }
  }

  async addFileToQueue(fileId: number) {
    this.logger.log(
      `Adding file ID ${fileId} to queue '${this.queueName}' with job name '${this.jobName}'`,
    );
    await this.fileQueue.add(
      this.jobName,
      { fileId },
      {
        // attempts: 3,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Job for file ID ${fileId} added successfully.`);
  }
}
