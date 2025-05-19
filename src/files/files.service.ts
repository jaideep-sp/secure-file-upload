import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { FileStatus } from '@prisma/client';
import { FileProducerService } from '../processing/file.producer.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import * as fs from 'fs'; 
type File = {
  id: number;
  userId: number;
  originalFilename: string;
  storagePath: string;
  mimetype: string;
  size: number;
  title: string;
  description: string;
  status: FileStatus;
  extractedData?: string;
  uploadedAt: Date;
  updatedAt: Date;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileProducerService: FileProducerService,
  ) {}

  async createFileRecord(
    uploadedFile: Express.Multer.File,
    dto: UploadFileDto,
    user: AuthenticatedUser,
  ) {
    if (!uploadedFile) {
      this.logger.error(
        `User ${user.email} attempt to create record without a file.`,
      );
      throw new BadRequestException('No file was uploaded.');
    }
    this.logger.log(
      `Creating file record for ${uploadedFile.originalname}
       (Size: ${uploadedFile.size},
        Mime: ${uploadedFile.mimetype}) by user ${user.id} (${user.email})`,
    );

    let newFile: File;
    try {
      newFile = await this.prisma.file.create({
        data: {
          userId: user.id,
          originalFilename: uploadedFile.originalname,
          storagePath: uploadedFile.path,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
          title: dto.title,
          description: dto.description,
          status: FileStatus.UPLOADED,
        },
      });

      this.logger.log(
        `File record ID ${newFile.id} created for ${newFile.originalFilename}. Path: ${newFile.storagePath}`,
      );
      await this.fileProducerService.addFileToQueue(newFile.id);

      return {
        id: newFile.id,
        status: newFile.status,
        originalFilename: newFile.originalFilename,
        title: newFile.title,
        description: newFile.description,
        message: 'File uploaded successfully and queued for processing.',
      };
    } catch (error) {
      this.logger.error(
        `Error creating file record or queueing for ${uploadedFile.originalname}: ${error.message}`,
        error.stack,
      );
      if (uploadedFile && uploadedFile.path) {
        try {
          fs.unlinkSync(uploadedFile.path);
          this.logger.log(
            `Cleaned up orphaned file due to error: ${uploadedFile.path}`,
          );
        } catch (cleanupError) {
          this.logger.error(
            `Failed to cleanup orphaned file ${uploadedFile.path}: ${cleanupError.message}`,
          );
        }
      }
      throw new InternalServerErrorException(
        'Failed to save file information or queue for processing.',
      );
    }
  }

  async getFileStatus(
    fileId: number,
    user: AuthenticatedUser,
  ): Promise<Omit<File, 'storagePath'>> {
    this.logger.log(
      `User ${user.email} requesting status for file ID: ${fileId}`,
    );
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      this.logger.warn(
        `File with ID ${fileId} not found for user ${user.email}.`,
      );
      throw new NotFoundException(`File with ID ${fileId} not found.`);
    }

    if (file.userId !== user.id) {
      this.logger.warn(
        `User ${user.email} (ID: ${user.id}) attempted to access unauthorized file ID ${fileId} (Owner ID: ${file.userId}).`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this file.',
      );
    }

    const { storagePath, ...result } = file;
    return result;
  }

  async getAllUserFiles(user: AuthenticatedUser, page: number, limit: number) {
    this.logger.log(
      `User ${user.email} listing files. Page: ${page}, Limit: ${limit}`,
    );
    const skip = (page - 1) * limit;

    const [files, total] = await this.prisma.$transaction([
      this.prisma.file.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          originalFilename: true,
          title: true,
          description: true,
          mimetype: true,
          size: true,
          status: true,
          extractedData: true,
          uploadedAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.file.count({ where: { userId: user.id } }),
    ]);

    return {
      data: files,
      meta: {
        total,
        page,
        limit,
        lastPage: total > 0 ? Math.ceil(total / limit) : 1,
      },
    };
  }
}
