import { NestFactory, HttpAdapterHost } from '@nestjs/core'; // Import HttpAdapterHost for AllExceptionsFilter
import { AppModule } from './app.module';
import {
  ValidationPipe,
  Logger,
  BadRequestException,
  LogLevel,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // Determine log levels based on NODE_ENV
  let logLevels: LogLevel[] = ['log', 'error', 'warn'];
  if (process.env.NODE_ENV === 'development') {
    logLevels = ['log', 'error', 'warn', 'debug', 'verbose'];
  } else if (process.env.NODE_ENV === 'test') {
    logLevels = ['error', 'warn']; // Less verbose for tests
  }

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  // Use the app's global logger instance, already configured with levels by NestFactory
  const globalLogger = app.get(Logger);
  // app.useLogger(globalLogger); // This is done by NestFactory by default if logger option is passed

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port');
  const nodeEnv = configService.get<string>('app.nodeEnv');
  const jwtSecret = configService.get<string>('app.jwtSecret');

  if (!jwtSecret || jwtSecret === 'YOUR_VERY_SECRET_JWT_KEY_CHANGE_THIS') {
    globalLogger.error(
      'FATAL ERROR: JWT_SECRET is not set or is default. Application cannot start securely.',
      'Bootstrap',
    );
    process.exit(1);
  }
  if (jwtSecret.length < 32 && nodeEnv === 'production') {
    globalLogger.warn(
      'SECURITY WARNING: JWT_SECRET is less than 32 characters long. Consider a stronger secret for production.',
      'Bootstrap',
    );
  }

  app.enableCors({
    // origin: true, // Reflect request origin or configure specific origins
    // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    // credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (error) =>
            `${error.property}: ${Object.values(error.constraints).join(', ')}`,
        );
        globalLogger.warn(
          `Validation failed: ${messages.join('; ')}`,
          'ValidationPipe',
        );
        return new BadRequestException({
          statusCode: 400,
          message: messages,
          error: 'Bad Request',
        });
      },
    }),
  );

  // Global Exception Filter (Optional but recommended)
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter, globalLogger));

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Secure File Upload API')
      .setDescription('API for file uploads, metadata, async processing.')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token', // Logical name for the security scheme
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: { persistAuthorization: true }, // Keep token in UI
      customSiteTitle: 'File Upload API Docs',
    });
    globalLogger.log(
      `Swagger UI running on http://localhost:${port}/api-docs`,
      'Bootstrap',
    );
  }

  app.getHttpAdapter().get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: nodeEnv,
    });
  });

  await app.listen(port);
  globalLogger.log(`Server running on http://localhost:${port}`, 'Bootstrap');
  globalLogger.log(`Environment: ${nodeEnv}`, 'Bootstrap');
  globalLogger.log(
    `Uploads destination: ${configService.get<string>('app.uploadDest')}`,
    'Bootstrap',
  );
  globalLogger.log(
    `Max file size: ${configService.get<number>('app.maxFileSize') / (1024 * 1024)}MB`,
    'Bootstrap',
  );
  globalLogger.log(
    `Default BullMQ queue name: ${configService.get<string>('bullmq.queueName')}`,
    'Bootstrap',
  );
}
bootstrap();
