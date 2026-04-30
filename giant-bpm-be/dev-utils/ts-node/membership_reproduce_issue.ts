import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Overlap Prevention Reproduction Script ---');

  // 1. Create test OrgUnit
  const orgCode = `REPRO_ORG_${Date.now()}`;
  const org = await prisma.orgUnit.create({
    data: {
      code: orgCode,
      name: 'Repro Org',
      type: 'ORG_UNIT',
      created_by: 1,
      updated_by: 1,
    },
  });
  console.log(`Created OrgUnit: ${org.code} (ID: ${org.id})`);

  // 2. Create test User
  const userCode = `REPRO_USER_${Date.now()}`;
  const user = await prisma.user.create({
    data: {
      code: userCode,
      name: 'Repro User',
      job_grade: 1,
    },
  });
  console.log(`Created User: ${user.code} (ID: ${user.id})`);

  try {
    // 3. Create a base membership
    const start1 = new Date('2023-01-01T00:00:00Z');
    const end1 = new Date('2023-12-31T23:59:59Z');

    await prisma.orgMembership.create({
      data: {
        org_unit_id: org.id,
        user_id: user.id,
        assign_type: 'USER',
        start_date: start1,
        end_date: end1,
        created_by: 1,
        updated_by: 1,
      },
    });
    console.log(
      `Created Base Membership: ${start1.toISOString()} to ${end1.toISOString()}`,
    );

    // 4. Test Overlap Logic (Manual Query)
    const checkOverlap = async (start: Date, end: Date) => {
      const overlap = await prisma.orgMembership.findFirst({
        where: {
          user_id: user.id,
          org_unit_id: org.id,
          AND: [{ start_date: { lt: end } }, { end_date: { gt: start } }],
        },
      });
      return overlap;
    };

    const testCases = [
      {
        name: 'Full Inside',
        start: new Date('2023-06-01T00:00:00Z'),
        end: new Date('2023-07-01T00:00:00Z'),
        expected: true,
      },
      {
        name: 'Partial Start',
        start: new Date('2022-12-01T00:00:00Z'),
        end: new Date('2023-02-01T00:00:00Z'),
        expected: true,
      },
      {
        name: 'Partial End',
        start: new Date('2023-11-01T00:00:00Z'),
        end: new Date('2024-02-01T00:00:00Z'),
        expected: true,
      },
      {
        name: 'Surrounding',
        start: new Date('2022-01-01T00:00:00Z'),
        end: new Date('2024-01-01T00:00:00Z'),
        expected: true,
      },
      {
        name: 'Exactly After',
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-12-31T00:00:00Z'),
        expected: false,
      },
      {
        name: 'Exactly Before',
        start: new Date('2022-01-01T00:00:00Z'),
        end: new Date('2023-01-01T00:00:00Z'),
        expected: false,
      },
    ];

    for (const tc of testCases) {
      const result = await checkOverlap(tc.start, tc.end);
      const isOverlap = !!result;
      console.log(
        `Test Case: ${tc.name.padEnd(15)} | Range: ${tc.start.toISOString()} - ${tc.end.toISOString()} | Overlap: ${isOverlap} | Result: ${isOverlap === tc.expected ? 'PASS' : 'FAIL'}`,
      );
    }
  } finally {
    // Cleanup
    await prisma.orgMembership.deleteMany({ where: { user_id: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.orgUnit.delete({ where: { id: org.id } });
    console.log('Cleanup completed.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
