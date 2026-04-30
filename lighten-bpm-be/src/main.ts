import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  Logger,
  ConsoleLogger,
  LogLevel,
} from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { openApiDocumentBuilder } from './generate-openapi-spec';
import { constructDatabaseUrl } from './config/database-url.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  // Disable colors globally to prevent ANSI codes in logs (CloudWatch, etc.)
  process.env.NO_COLOR = '1';
  process.env.FORCE_COLOR = '0';

  // Construct DATABASE_URL from separate environment variables (for AWS environments)
  // In local development, DATABASE_URL should be set in .env file
  if (!process.env.DATABASE_URL) {
    try {
      process.env.DATABASE_URL = constructDatabaseUrl();
      console.log(
        '[Bootstrap] ✓ DATABASE_URL configured from environment variables',
      );
    } catch (error) {
      console.error('[Bootstrap] ✗ Failed to construct DATABASE_URL');
      console.error('[Bootstrap] Error:', error);
      process.exit(1);
    }
  } else {
    console.log('[Bootstrap] ✓ Using DATABASE_URL from environment');
  }

  const logLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
  const customLogger = new ConsoleLogger('Bootstrap', {
    logLevels,
    timestamp: true,
  });

  const app = await NestFactory.create(AppModule, {
    logger: customLogger,
  });

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: false,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Enable global exception filter for unified error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = openApiDocumentBuilder();
  const document = SwaggerModule.createDocument(app, config);

  // OpenAPI documentation at /openapi
  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: 'openapi/json',
  });

  Logger.log(
    `Swagger UI available at: http://localhost:3000/openapi`,
    'Bootstrap',
  );

  Logger.log(
    `Swagger JSON Link at: http://localhost:3000/openapi/json`,
    'Bootstrap',
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(
    `Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
}

void bootstrap();
