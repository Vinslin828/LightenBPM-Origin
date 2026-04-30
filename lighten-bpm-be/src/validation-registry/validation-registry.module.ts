import { Module } from '@nestjs/common';
import { ValidationRegistryController } from './validation-registry.controller';
import { ValidationRegistryService } from './validation-registry.service';
import { ValidationComponentMappingService } from './validation-component-mapping.service';
import { ValidationRegistryRepository } from './repositories/validation-registry.repository';
import { ValidationComponentMappingRepository } from './repositories/validation-component-mapping.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ValidationRegistryController],
  providers: [
    ValidationRegistryService,
    ValidationComponentMappingService,
    ValidationRegistryRepository,
    ValidationComponentMappingRepository,
  ],
  exports: [
    ValidationRegistryService,
    ValidationComponentMappingService,
    ValidationRegistryRepository,
    ValidationComponentMappingRepository,
  ],
})
export class ValidationRegistryModule {}
