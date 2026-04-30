import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('healthy')
@ApiTags('System Healthy API')
export class HealthyController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get('/status')
  @ApiOperation({ summary: 'Get comprehensive health status' })
  @HealthCheck()
  async getStatus() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      // TODO: Adjust memory limits based on actual usage patterns
      // () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      // () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
    ]);
  }
}
