import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaTransactionClient } from './transaction-client.type';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs a callback within a database transaction.
   * Use this service instead of injecting PrismaService directly.
   */
  async runTransaction<T>(
    fn: (tx: PrismaTransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
