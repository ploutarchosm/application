import { IsNotEmpty, IsNumber, IsString, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';


export class AppConfigDto {
    @IsNumber()
    @IsNotEmpty({ message: 'APP_PORT is required for ApplicationConfig module' })
    port: number;

    @IsString()
    @IsNotEmpty({ message: 'APP_NAME is required for ApplicationConfig module' })
    name: string;

    @IsString()
    @IsNotEmpty({ message: 'APP_ENVIRONMENT is required for ApplicationConfig module' })
    environment: string;

    @IsString()
    @IsNotEmpty({ message: 'APP_FRONT_END_URL is required for ApplicationConfig module' })
    frontEndUrl: string;

    @IsString()
    @IsNotEmpty({ message: 'APP_NAMESPACE is required for ApplicationConfig module'})
    namespace: string;

    @IsString()
    @IsNotEmpty({ message: 'APP_SWAGGER_PATH is required for ApplicationConfig module'})
    swaggerPath: string;
}

export function validateAppConfig(config: Record<string, any>): AppConfigDto {
    const validatedConfig = plainToClass(AppConfigDto, config, {
        enableImplicitConversion: true,
    });
    const errors = validateSync(validatedConfig, { skipMissingProperties: false });

    if (errors.length > 0) {
        const errorMessages = errors
            .map(error => Object.values(error.constraints || {}).join(', '))
            .join('; ');
        throw new Error(`Application configuration validation failed: ${errorMessages}`);
    }

    return validatedConfig;
}
