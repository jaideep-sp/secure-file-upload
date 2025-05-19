import { registerAs } from '@nestjs/config';

export const DEFAULT_FILE_PROCESSING_QUEUE_NAME = 'file-processing-queue';
export const DEFAULT_PROCESS_FILE_JOB_NAME = 'process-file-job';

export default registerAs('bullmq', () => ({
  queueName:
    process.env.FILE_PROCESSING_QUEUE_NAME ||
    DEFAULT_FILE_PROCESSING_QUEUE_NAME,
  jobName: process.env.PROCESS_FILE_JOB_NAME || DEFAULT_PROCESS_FILE_JOB_NAME,
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
}));
