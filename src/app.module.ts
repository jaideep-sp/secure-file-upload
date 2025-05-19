import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProcessingModule } from './processing/processing.module';
import appConfig from './config/app.config';
import bullmqConfig from './config/bullmq.config';
// import { ServeStaticModule } from '@nestjs/serve-static';
// import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, bullmqConfig],
      envFilePath: '.env',
      cache: true,
    }),
    PrismaModule,
    AuthModule,
    FilesModule,
    ProcessingModule,
    // Optional: Serve uploaded files statically (Not secure for user-isolated files without custom logic)
    // ServeStaticModule.forRoot({
    //   rootPath: join(process.cwd(), process.env.UPLOAD_DEST || './uploads'),
    //   serveRoot: '/static-uploads', // e.g., http://localhost:3000/static-uploads/yourfile.jpg
    //   serveStaticOptions: {
    //     // etag: true, // Caching options
    //     // lastModified: true,
    //   }
    // }),
  ],
  providers: [
    // Provide Logger globally. This ensures Logger is injectable throughout the app.
    // NestJS usually handles this well for its built-in logger, but explicit is fine.
    Logger,
  ],
})
export class AppModule {}
