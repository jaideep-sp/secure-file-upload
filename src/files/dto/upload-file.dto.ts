import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({
    required: false,
    description: 'Optional title for the file',
    maxLength: 255,
    example: 'My Vacation Photo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    required: false,
    description: 'Optional description for the file',
    example: 'A picture from my trip to the mountains.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
