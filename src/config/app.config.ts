import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpirationTime: process.env.JWT_EXPIRATION_TIME || '3600s',
  uploadDest: process.env.UPLOAD_DEST || './uploads',
  maxFileSize:
    parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 10 * 1024 * 1024,
}));
