import { Test, TestingModule } from '@nestjs/testing';
import { FormController } from './form.controller';
import { FormModule } from './form.module';
import { AuthModule } from '../auth/auth.module';

describe('FormController', () => {
  let controller: FormController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FormModule, AuthModule],
    }).compile();

    controller = module.get<FormController>(FormController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
