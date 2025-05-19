import { Processor, WorkerHost } from '@nestjs/bullmq'; // Changed import
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
// Import FileStatus from @prisma/client if it's defined there
// Or keep your local enum if it's only used here.
// For consistency, if FileStatus is in your schema.prisma, import it:
enum FileStatus {
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';
import { FileJobData } from './file.producer.service';
import { ConfigService } from '@nestjs/config';

// The processor's queue name must match the one used in the module registration and producer
@Processor(process.env.FILE_PROCESSING_QUEUE_NAME || 'file-processing-queue')
export class FileProcessor extends WorkerHost {
  // Extend WorkerHost
  private readonly logger = new Logger(FileProcessor.name);
  private readonly configuredJobName: string; // Store the job name we expect to process

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(); // Call super() for WorkerHost
    this.configuredJobName = this.configService.get<string>('bullmq.jobName');
  }

  // This single 'process' method will handle all jobs pushed to this worker's queue
  async process(job: Job<FileJobData, any, string>): Promise<any> {
    // string is the type for job.name
    this.logger.log(
      `Received job: ID=${job.id}, Name=${job.name}, Data=${JSON.stringify(job.data)}`,
    );

    // If you intend this worker to only process jobs with a specific name:
    if (job.name !== this.configuredJobName) {
      this.logger.warn(
        `Job ${job.id} with name ${job.name} is not the configured job name '${this.configuredJobName}'. Skipping.`,
      );
      // You might throw an error or simply return to ignore it.
      // Depending on queue setup, unhandled jobs might be retried or marked as failed.
      // For this setup, we assume all jobs in this queue are meant for this processor.
      // If this check is crucial, ensure jobs are added to the queue with the correct name.
    }

    // Here, we directly call the logic because we assume all jobs in this queue
    // are 'process-file-job' as configured. If you had multiple job types in this queue,
    // you would use a switch statement on job.name as per the docs.

    // Example structure for multiple job names in one queue/processor:
    // switch (job.name) {
    //   case this.configuredJobName: // e.g., 'process-file-job'
    //     return this.handleProcessFileLogic(job.data, job);
    //   case 'another-job-type':
    //     // return this.handleAnotherJobType(job.data, job);
    //     break;
    //   default:
    //     this.logger.warn(`Unknown job name: ${job.name}`);
    //     throw new Error(`Unhandled job name: ${job.name}`);
    // }

    // For this specific task, we directly call the processing logic:
    return this.handleProcessFileLogic(job.data, job);
  }

  // Extracted the actual file processing logic into a helper method
  private async handleProcessFileLogic(
    data: FileJobData,
    job: Job<FileJobData, any, string>,
  ) {
    const { fileId } = data;
    this.logger.log(`Processing file ID: ${fileId} (Job ID: ${job.id})`);

    const fileRecord = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord) {
      this.logger.error(
        `File with ID ${fileId} not found for job ${job.id}. Job will fail.`,
      );
      throw new Error(`File with ID ${fileId} not found.`);
    }

    try {
      await this.prisma.file.update({
        where: { id: fileId },
        data: { status: FileStatus.PROCESSING, updatedAt: new Date() },
      });
      this.logger.log(`File ID ${fileId} status updated to PROCESSING.`);

      const processingTime = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
      this.logger.log(
        `Simulating ${processingTime}ms processing for file ID ${fileId}`,
      );
      await new Promise((resolve) => setTimeout(resolve, processingTime));

      const fileContent = await fs.readFile(fileRecord.storagePath);
      const hash = crypto.createHash('md5').update(fileContent).digest('hex');
      const extractedData = `MD5 Checksum: ${hash}, Size: ${fileRecord.size} bytes, Original: ${fileRecord.originalFilename.substring(0, 50)}`;

      await this.prisma.file.update({
        where: { id: fileId },
        data: {
          status: FileStatus.PROCESSED,
          extractedData: extractedData,
          updatedAt: new Date(),
        },
      });
      this.logger.log(
        `File ID ${fileId} processed successfully. Extracted data: ${extractedData.substring(0, 100)}...`,
      );
      return {
        success: true,
        fileId: fileId,
        message: 'File processed successfully.',
      }; // Example return value
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown processing error';
      this.logger.error(
        `Failed to process file ID ${fileId} (Job ID: ${job.id}): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.prisma.file.update({
        where: { id: fileId },
        data: {
          status: FileStatus.FAILED,
          extractedData: `Error: ${errorMessage.substring(0, 250)}`,
          updatedAt: new Date(),
        },
      });
      throw error; // Re-throw so BullMQ marks job as failed
    }
  }
}
