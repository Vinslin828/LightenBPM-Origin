import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import { dump } from 'js-yaml';

export function openApiDocumentBuilder() {
  return new DocumentBuilder()
    .setTitle('GBPM API Definition')
    .setDescription('The GBPM API for Business Process Management')
    .setOpenAPIVersion('3.1.1')
    .setVersion('0.0.1')
    .addServer('https://api.server.test/v1')
    .build();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const config = openApiDocumentBuilder();
  const document = SwaggerModule.createDocument(app, config);
  fs.writeFileSync('./openapi.yaml', dump(document));

  await app.close();
}
void bootstrap();
