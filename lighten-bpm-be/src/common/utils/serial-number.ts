import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

export async function generateWorkflowSerialNumber(
  prefix: string,
  issueDate: Date,
  tx: PrismaTransactionClient,
): Promise<string> {
  const dateStr = formatIssueDate(issueDate);

  const rows = await tx.$queryRaw<Array<{ counter: number }>>`
    INSERT INTO "serial_counters" ("serial_prefix", "date", "counter")
    VALUES (${prefix}, ${dateStr}, 1)
    ON CONFLICT ("serial_prefix", "date")
    DO UPDATE SET "counter" = "serial_counters"."counter" + 1
    RETURNING "counter"
  `;

  const paddedSeq = String(rows[0].counter).padStart(4, '0');
  return `${prefix}-${dateStr}${paddedSeq}`;
}

function formatIssueDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
