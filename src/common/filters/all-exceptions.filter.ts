import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  LoggerService,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core'; 
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: LoggerService, 
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let responseMessage: string | object = 'Internal server error';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      const excResponse = exception.getResponse();
      errorType = exception.constructor.name;
      if (typeof excResponse === 'string') {
        responseMessage = excResponse;
      } else if (typeof excResponse === 'object' && excResponse !== null) {
        responseMessage = (excResponse as any).message || exception.message;
        if (Array.isArray((excResponse as any).message)) {
          responseMessage = (excResponse as any).message.join('; ');
        }
        if ((excResponse as any).error && (excResponse as any).statusCode) {
          responseMessage = excResponse;
        }
      } else {
        responseMessage = exception.message;
      }
    } else if (exception instanceof Error) {
      responseMessage = exception.message;
      errorType = exception.constructor.name;
    }

    this.logger.error(
      `[${AllExceptionsFilter.name}] - ${request.method} ${request.url}
       - Status: ${httpStatus}
       - ErrorType: ${errorType}
       - Message: ${typeof responseMessage === 'string' ? responseMessage : JSON.stringify(responseMessage)}`,
      exception instanceof Error ? exception.stack : undefined, 
    );

    const responseBody: {
      statusCode?: number;
      timestamp?: string;
      path?: string;
      method?: string;
      errorType?: string;
      message?: string | object;
    } =
      typeof responseMessage === 'object'
        ? (responseMessage as any)
        : {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(request),
            method: httpAdapter.getRequestMethod(request),
            errorType: errorType,
            message: responseMessage,
          };

    if (
      typeof responseBody.statusCode === 'undefined' &&
      typeof (responseMessage as any)?.statusCode !== 'undefined'
    ) {
    } else if (typeof responseBody.statusCode === 'undefined') {
      responseBody.statusCode = httpStatus;
    }
    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
