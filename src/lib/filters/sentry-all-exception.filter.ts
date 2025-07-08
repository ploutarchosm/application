import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';
import { getErrorMessage, getErrorStack } from "@ploutos/common";

@Catch()
export class SentryAllExceptionFilter extends BaseExceptionFilter  {
    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Categorize error type
        const errorInfo = this.categorizeError(exception);

        // Capture the exception in Sentry
        Sentry.captureException(exception);
        // this.captureExceptionInSentry(exception, request, errorInfo);


        // Create detailed error response
        const errorResponse = {
            success: false,
            statusCode: errorInfo.status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            error: {
                type: errorInfo.type,
                message: errorInfo.message,
                ...(errorInfo.details && { details: errorInfo.details }),
            },
        };

        return super.catch(exception, host);
        // response.status(errorInfo.status).json(errorResponse);
        // return super.catch(new BadRequestException(exception.message), host);
    }

    private captureExceptionInSentry(
        exception: unknown,
        request: Request,
        errorInfo: ReturnType<typeof this.categorizeError>
    ): void {
        // Only send to Sentry if it's a server error or if you want to track all errors
        // You can customize this logic based on your needs
        // if (errorInfo.status >= 500 || this.shouldCaptureClientError(errorInfo)) {}
        // Capture ALL!


    }

    private shouldCaptureClientError(errorInfo: ReturnType<typeof this.categorizeError>): boolean {
        // Customize this method to determine which client errors (4xx) should be sent to Sentry
        // For example, you might want to capture:
        // - Validation errors that indicate a bug in your frontend
        // - Unexpected 404s
        // - Authentication errors that shouldn't happen

        // Example: Capture specific error types
        const errorTypesToCapture = [
            'DUPLICATE_KEY_ERROR', // This might indicate a race condition
            'VALIDATION_ERROR', // Might indicate frontend validation issues
            'BAD_REQUEST'
        ];

        return errorTypesToCapture.includes(errorInfo.type);
    }

    private categorizeError(exception: unknown) {
        const message = getErrorMessage(exception);
        const stack = getErrorStack(exception);

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const response = exception.getResponse();

            return {
                type: this.getErrorType(status),
                status,
                message,
                stack,
                details: typeof response === 'object' ? response : null,
            };
        }

        // Handle MongoDB/Mongoose errors
        if (exception && typeof exception === 'object' && 'name' in exception) {
            const error = exception as any;

            if (error.name === 'ValidationError') {
                return {
                    type: 'VALIDATION_ERROR',
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Validation failed',
                    stack,
                    details: Object.values(error.errors).map((err: any) => err.message),
                };
            }

            if (error.name === 'MongoServerError' && error.code === 11000) {
                return {
                    type: 'DUPLICATE_KEY_ERROR',
                    status: HttpStatus.CONFLICT,
                    message: 'Duplicate entry detected',
                    stack,
                    details: error.keyValue,
                };
            }
        }

        // Default to internal server error
        return {
            type: 'INTERNAL_SERVER_ERROR',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message,
            stack,
        };


    }

    private getErrorType(status: number): string {
        switch (status) {
            case HttpStatus.BAD_REQUEST:
                return 'BAD_REQUEST';
            case HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED';
            case HttpStatus.FORBIDDEN:
                return 'FORBIDDEN';
            case HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case HttpStatus.CONFLICT:
                return 'CONFLICT';
            case HttpStatus.UNPROCESSABLE_ENTITY:
                return 'VALIDATION_ERROR';
            case HttpStatus.INTERNAL_SERVER_ERROR:
                return 'INTERNAL_SERVER_ERROR';
            default:
                return 'HTTP_ERROR';
        }
    }
}
