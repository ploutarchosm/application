import { Module, OnModuleInit, Logger, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {AppConfigDto, validateAppConfig} from "./dto/app-config.dto";

@Module({})
export class ApplicationConfigModule implements OnModuleInit {
    private readonly logger = new Logger(ApplicationConfigModule.name);
    private static config: AppConfigDto;

    static forRoot(): DynamicModule {
        return {
            module: ApplicationConfigModule,
            providers: [
                {
                    provide: 'APP_CONFIG',
                    useFactory: (configService: ConfigService) => {
                        // Validate configuration at module initialization
                        this.config = validateAppConfig({
                            port: configService.get<number>('APP_PORT'),
                            name: configService.get<string>('APP_NAME'),
                            environment: configService.get<string>('APP_ENVIRONMENT'),
                            frontEndUrl: configService.get<string>('APP_FRONT_END_URL'),
                            namespace: configService.get<string>('APP_NAMESPACE'),
                            swaggerPath: configService.get<boolean>('APP_SWAGGER_PATH'),
                        });

                        return this.config;
                    },
                    inject: [ConfigService],
                },
            ],
            exports: ['APP_CONFIG'],
        };
    }

    onModuleInit() {
        this.logger.log('ApplicationConfig module initialized with validated configuration');
    }
}
