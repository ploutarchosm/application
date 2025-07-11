import { NestExpressApplication } from "@nestjs/platform-express";
import { Logger, Type } from "@nestjs/common";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { useContainer } from "class-validator";
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { SECURITY_API_TOKEN_HEADER_KEY } from "@ploutos/common";
import { json } from 'body-parser';
import { MongoExceptionFilter } from "./filters/mongo-exception-filter";
import { SentryAllExceptionFilter } from "./filters/sentry-all-exception.filter";

declare type ApplicationConfigurationDelegate = (
    app: NestExpressApplication
) => void;

export class Application {
   private application: NestExpressApplication | undefined;
   private logger = new Logger(Application.name);
   private readonly apiPrefix: string;

   constructor(apiPrefix: string) {
       this.apiPrefix = apiPrefix;
   }

   async run(appModule: Type<any>, delegate?: ApplicationConfigurationDelegate): Promise<void> {

       try {
           this.application = await NestFactory.create<NestExpressApplication>(appModule, {
               bodyParser: true,
               logger: ['error', 'warn', 'log', 'debug', 'verbose'],
           });

           const config = this.application.get(ConfigService);

           this.application.disable('x-powered-by');
           this.application.setGlobalPrefix(this.apiPrefix);

           const env = config.get<string>('APP_ENVIRONMENT');

           if (env === 'DEV') {
               const swaggerConfig = new DocumentBuilder()
                   .setTitle('API Documentation')
                   .setDescription('API developed by Ploutarchos Michaelides')
                   .setVersion('1.0')
                   .addApiKey(
                       {
                           type: 'apiKey',
                           name: SECURITY_API_TOKEN_HEADER_KEY,
                           in: 'header',
                           description: 'API token used for secured endpoints',
                       },
                       SECURITY_API_TOKEN_HEADER_KEY,
                   )
                   .build();

               const document = SwaggerModule.createDocument(this.application, swaggerConfig);
               SwaggerModule.setup(config.get<string>('APP_SWAGGER_PATH'), this.application, document);
           }

           const { httpAdapter } = this.application.get(HttpAdapterHost);
           this.application.useGlobalFilters(new SentryAllExceptionFilter(httpAdapter));
           this.application.useGlobalFilters(new MongoExceptionFilter());

           const container = this.application.select(appModule);

           useContainer(container, {
               fallback: true,
               fallbackOnErrors: true
           });

           this.application.use(
               json({
                   limit: '250mb',
               }),
           );

           this.application.enableCors({
               origin: config.get('APP_FRONT_END_URL'),
           })

           if (delegate) {
               delegate(this.application);
           }

           const port = config.get('APP_PORT');

           await this.application.listen(port);
           console.log(`Starting Application in ${env} mode.`);
           console.log(`Application is listen at port ${port}`);
       } catch (error) {
           console.error('Failed to start application: ', error);
           this.logger.error('Failed to start application: ', error);
           throw error;
       }
   }

   getApplication() {
    if (!this.application) {
        this.logger.error('Application is not initialized. Call run() first.');
        throw new Error('Application is not initialized. Call run() first.');
    }
    return this.application;
   }

   isRunning(): boolean {
        return !!this.application;
   }

   async stop(): Promise<void> {
       if (this.isRunning()) {
           await this.application.close();
           this.application = undefined;
       }
   }
}
