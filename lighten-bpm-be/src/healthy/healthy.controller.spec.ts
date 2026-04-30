import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { HealthyController } from './healthy.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthyController', () => {
  let controller: HealthyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthyController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthyController>(HealthyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
