import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { MongoError } from 'mongodb';

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
    catch(exception: MongoError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = 500;
        let message = 'Internal server error';

        if (exception.message.includes('Cast to ObjectId failed')) {
            status = 400;
            message = 'Invalid ObjectId format';
        }

        if (exception.message.includes('value must be >= 0')) {
            status = 400;
            message = 'Pagination values must be >= 0';
        }

        response.status(status).json({
            statusCode: status,
            message: message,
            error: status === 400 ? 'Bad Request' : 'Internal Server Error',
        });
    }
}
