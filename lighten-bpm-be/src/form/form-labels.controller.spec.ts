import { Test, TestingModule } from '@nestjs/testing';
import { FormLabelsController } from './form-labels.controller';

describe('FormLabelsController', () => {
  let controller: FormLabelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormLabelsController],
    }).compile();

    controller = module.get<FormLabelsController>(FormLabelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
