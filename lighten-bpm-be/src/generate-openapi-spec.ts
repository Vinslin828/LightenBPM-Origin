import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import { dump } from 'js-yaml';

export function openApiDocumentBuilder() {
  return new DocumentBuilder()
    .setTitle('Lighten BPM API Definition')
    .setDescription('The Lighten BPM API for Business Process Management')
    .setOpenAPIVersion('3.1.1')
    .setVersion('0.0.1')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.server.test/v1', 'Production')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
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
