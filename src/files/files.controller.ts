import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  Get,
  Param,
  ParseIntPipe,
  Query,
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

// Get maxFileSize from .env directly for decorator, as ConfigService isn't available at class definition.
// MulterModule will use the ConfigService for the primary check.
const maxFileSizeForPipeValidator =
  parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 10 * 1024 * 1024;

@ApiTags('Files')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(
    private readonly filesService: FilesService,
    // ConfigService is available here and used by MulterModule implicitly via FilesModule
    private readonly configService: ConfigService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file')) // Configured in FilesModule
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'File upload with optional metadata. Max file size configured by server.',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload.',
        },
        title: { type: 'string', nullable: true, example: 'My Document' },
        description: {
          type: 'string',
          nullable: true,
          example: 'Important contract details.',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 202,
    description: 'File uploaded and queued for processing.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request (e.g., file too large, missing file, validation error).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // This MaxFileSizeValidator acts as a secondary check.
          // Primary limit is from MulterModule.registerAsync.
          new MaxFileSizeValidator({ maxSize: maxFileSizeForPipeValidator }),
        ],
        // fileIsRequired: true, // default is true
        exceptionFactory: (error) => {
        //   this.logger.warn(
        //     `ParseFilePipe validation failed: ${error ?? 'Unknown error'}`,
        //   );
          return new BadRequestException(`File validation error: ${error}`);
        },
      }),
    )
    uploadedFile: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @User() user: AuthenticatedUser,
  ) {
    // uploadedFile will be null if Multer rejects (e.g. too large) before ParseFilePipe runs,
    // or if fileIsRequired=false and no file is sent.
    // ParseFilePipe handles the `fileIsRequired` case.
    if (!uploadedFile) {
      this.logger.warn(
        `Upload attempt by ${user.email} without a file object reaching the controller (likely filtered by Multer).`,
      );
      throw new BadRequestException(
        'No file uploaded or file rejected by pre-validation. Ensure the "file" field is correct and the file meets server criteria.',
      );
    }
    this.logger.log(
      `Upload request for ${uploadedFile.originalname} (size: ${uploadedFile.size} B) by ${user.email}`,
    );
    return this.filesService.createFileRecord(
      uploadedFile,
      uploadFileDto,
      user,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file status and metadata' })
  @ApiParam({ name: 'id', type: 'number', description: 'File ID', example: 1 })
  @ApiResponse({ status: 200, description: 'File details retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner of file).' })
  @ApiResponse({ status: 404, description: 'File not found.' })
  async getFileStatus(
    @Param('id', ParseIntPipe) id: number,
    @User() user: AuthenticatedUser,
  ) {
    this.logger.log(`File status request for ID ${id} by user ${user.email}`);
    return this.filesService.getFileStatus(id, user);
  }

  @Get()
  @ApiOperation({ summary: "List user's files (paginated)" })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-indexed)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max 100)',
    example: 10,
  })
  @ApiResponse({ status: 200, description: 'List of files retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getAllFiles(
    @User() user: AuthenticatedUser,
    @Query(
      'page',
      new ParseIntPipe({
        optional: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    page?: number,
    @Query(
      'limit',
      new ParseIntPipe({
        optional: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    limit?: number,
  ) {
    const resolvedPage = page && page > 0 ? page : 1;
    let resolvedLimit = limit && limit > 0 ? limit : 10;
    if (resolvedLimit > 100) resolvedLimit = 100;

    this.logger.log(
      `List files request for ${user.email} - Page: ${resolvedPage}, Limit: ${resolvedLimit}`,
    );
    return this.filesService.getAllUserFiles(user, resolvedPage, resolvedLimit);
  }
}
