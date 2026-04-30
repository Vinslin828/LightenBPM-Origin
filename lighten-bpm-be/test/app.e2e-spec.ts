import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { App } from 'supertest/types';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/version (GET)', () => {
    return request(app.getHttpServer())
      .get('/version')
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveProperty('version');
        expect(res.body).toHaveProperty('commitSha');
        expect(res.body).toHaveProperty('buildDate');
      });
  });

  it('/healthy/status (GET)', () => {
    return request(app.getHttpServer()).get('/healthy/status').expect(200);
  });
});
