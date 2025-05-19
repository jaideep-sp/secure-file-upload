import { Module, Logger } from '@nestjs/common'; 
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path'; 
import { ProcessingModule } from '../processing/processing.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger(MulterModule.name);
        const relativeUploadDest = configService.get<string>('app.uploadDest');
        const absoluteUploadDest = path.isAbsolute(relativeUploadDest)
          ? relativeUploadDest
          : path.join(process.cwd(), relativeUploadDest);

        logger.log(
          `Configured upload destination (relative): ${relativeUploadDest}`,
        );
        logger.log(
          `Resolved upload destination (absolute): ${absoluteUploadDest}`,
        );

        if (!fs.existsSync(absoluteUploadDest)) {
          try {
            fs.mkdirSync(absoluteUploadDest, { recursive: true });
            logger.log(`Upload directory created: ${absoluteUploadDest}`);
          } catch (err) {
            logger.error(
              `Error creating upload directory ${absoluteUploadDest}: `,
              err.stack,
            );
            throw new Error(
              `Could not create upload directory: ${err.message}`,
            );
          }
        } else {
          logger.log(`Upload directory already exists: ${absoluteUploadDest}`);
        }

        const maxFileSize = configService.get<number>('app.maxFileSize');
        logger.log(
          `Multer configured with max file size: ${maxFileSize / (1024 * 1024)} MB`,
        );

        return {
          storage: diskStorage({
            destination: (req, file, cb) => {
              cb(null, absoluteUploadDest);
            },
            filename: (req, file, cb) => {
              const randomName = Array(32)
                .fill(null)
                .map(() => Math.round(Math.random() * 16).toString(16))
                .join('');
              const filename = `${randomName}${extname(file.originalname)}`;
              cb(null, filename);
            },
          }),
          limits: {
            fileSize: maxFileSize,
          },
          // fileFilter: (req, file, cb) => {
          //   if (!file.mimetype.startsWith('image/')) {
          //     return cb(new BadRequestException('Only image files are allowed!'), false);
          //   }
          //   cb(null, true);
          // },
        };
      },
      inject: [ConfigService],
    }),
    ProcessingModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
